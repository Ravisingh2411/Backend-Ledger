
const request = require('supertest');
const express = require('express');

const mockState = {
    accounts: [],
    sender: null,
    receiver: null,
    receiverUser: {
        email: 'receiver@example.com',
        name: 'Receiver'
    },
    existingTransaction: null,
    legacyTransaction: null,
    duplicateTransaction: null,
    transactionFindOneCalls: 0,
    balance: 1000,
    transactionSaveError: null,
    ledgerCreateError: null,
    accountUpdateResult: true,
    sessionCreationError: null,
    sessionError: null,
    emailError: null,
    receiverEmailError: null,
    endSession: jest.fn()
};

const mockTransactionConstructor = jest.fn();

jest.mock('../src/models/transaction.model', () => {
    const MockTransaction = function(data) {
        Object.assign(this, data);
        this._id = 'transaction123';

        this.save = jest.fn(async () => {
            if (mockState.transactionSaveError) {
                throw mockState.transactionSaveError;
            }
        });

        mockTransactionConstructor(this);
    };

    MockTransaction.findOne = jest.fn(async query => {
        if (query.initiatedBy && query.idempotencyKey) {
            mockState.transactionFindOneCalls += 1;

            if (mockState.transactionFindOneCalls === 1) {
                return mockState.existingTransaction;
            }

            return mockState.duplicateTransaction;
        }

        if (query.initiatedBy === null) {
            return mockState.legacyTransaction;
        }

        return null;
    });

    return MockTransaction;
});

jest.mock('../src/models/account.model', () => ({
    findOne: jest.fn(async () => mockState.sender),

    find: jest.fn(() => ({
        populate: jest.fn(() => ({
            session: jest.fn(async () => mockState.accounts)
        }))
    })),

    findOneAndUpdate: jest.fn(async () => {
        if (!mockState.accountUpdateResult) {
            return null;
        }

        return { _id: 'locked-account' };
    }),

    findById: jest.fn(() => ({
        populate: jest.fn(async () => ({
            user: mockState.receiverUser
        }))
    }))
}));

jest.mock('../src/models/ledger.model', () => ({
    create: jest.fn(async () => {
        if (mockState.ledgerCreateError) {
            throw mockState.ledgerCreateError;
        }
    })
}));

jest.mock('../src/services/email.service', () => ({
    sendTransactionEmail: jest.fn(async () => {
        if (mockState.emailError) {
            throw mockState.emailError;
        }
    }),

    sendMoneyReceivedEmail: jest.fn(async () => {
        if (mockState.receiverEmailError) {
            throw mockState.receiverEmailError;
        }
    })
}));

jest.mock('mongoose', () => {
    const actualMongoose = jest.requireActual('mongoose');

    return {
        ...actualMongoose,

        startSession: jest.fn(async () => {
            if (mockState.sessionCreationError) {
                throw mockState.sessionCreationError;
            }

            return {
                withTransaction: jest.fn(async callback => {
                    if (mockState.sessionError) {
                        throw mockState.sessionError;
                    }

                    await callback();
                }),

                endSession: mockState.endSession
            };
        })
    };
});

const transactionController = require('../src/controllers/transaction.controller');
const transactionModel = require('../src/models/transaction.model');
const accountModel = require('../src/models/account.model');
const ledgerModel = require('../src/models/ledger.model');
const emailService = require('../src/services/email.service');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());

app.post('/transactions', (req, res) => {
    req.user = {
        _id: '507f1f77bcf86cd799439011',
        email: 'sender@example.com',
        name: 'Sender'
    };

    return transactionController.createTransaction(req, res);
});

const senderId = '507f1f77bcf86cd799439012';
const receiverId = '507f1f77bcf86cd799439013';
const userId = '507f1f77bcf86cd799439011';

function createAccount(id, user, status = 'ACTIVE') {
    return {
        _id: id,
        user: { _id: user },
        status,
        currency: 'INR',
        getBalance: jest.fn(async () => mockState.balance)
    };
}

function validRequest(overrides = {}) {
    return {
        fromAccount: senderId,
        toAccount: receiverId,
        amount: 100,
        idempotencyKey: 'transfer-key-1',
        ...overrides
    };
}

function setupSuccessfulTransfer() {
    mockState.sender = createAccount(senderId, userId);

    mockState.accounts = [
        createAccount(senderId, userId),
        createAccount(receiverId, '507f1f77bcf86cd799439014')
    ];
}

function createDuplicateKeyError() {
    const error = new Error('Duplicate key error');
    error.code = 11000;

    return error;
}

function createExistingTransaction(overrides = {}) {
    return {
        fromAccount: senderId,
        toAccount: receiverId,
        amount: 100,
        status: 'COMPLETED',
        ...overrides
    };
}

beforeEach(() => {
    jest.clearAllMocks();

    mockState.accounts = [];
    mockState.sender = null;
    mockState.receiver = null;
    mockState.receiverUser = {
        email: 'receiver@example.com',
        name: 'Receiver'
    };
    mockState.existingTransaction = null;
    mockState.legacyTransaction = null;
    mockState.duplicateTransaction = null;
    mockState.transactionFindOneCalls = 0;
    mockState.balance = 1000;
    mockState.transactionSaveError = null;
    mockState.ledgerCreateError = null;
    mockState.accountUpdateResult = true;
    mockState.sessionCreationError = null;
    mockState.sessionError = null;
    mockState.emailError = null;
    mockState.receiverEmailError = null;

    setupSuccessfulTransfer();
});

describe('Transaction Controller', () => {
    describe('Request validation', () => {
        test('should reject missing required fields', async () => {
            const response = await request(app)
                .post('/transactions')
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.message).toMatch(/required/i);
        });

        test('should reject invalid sender account ID', async () => {
            const response = await request(app)
                .post('/transactions')
                .send(validRequest({ fromAccount: 'invalid-id' }));

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Invalid account ID');
        });

        test('should reject invalid receiver account ID', async () => {
            const response = await request(app)
                .post('/transactions')
                .send(validRequest({ toAccount: 'invalid-id' }));

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Invalid account ID');
        });

        test.each([
            0,
            -100,
            '100',
            NaN,
            Infinity,
            10.123
        ])('should reject invalid amount: %s', async amount => {
            const response = await request(app)
                .post('/transactions')
                .send(validRequest({ amount }));

            expect(response.status).toBe(400);
            expect(response.body.message).toMatch(/amount/i);
        });

        test('should reject empty idempotency key', async () => {
            const response = await request(app)
                .post('/transactions')
                .send(validRequest({ idempotencyKey: '   ' }));

            expect(response.status).toBe(400);
            expect(response.body.message).toMatch(/idempotency/i);
        });

        test('should reject numeric idempotency key', async () => {
            const response = await request(app)
                .post('/transactions')
                .send(validRequest({ idempotencyKey: 12345 }));

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Invalid idempotency key');
        });

        test('should reject object idempotency key', async () => {
            const response = await request(app)
                .post('/transactions')
                .send(validRequest({
                    idempotencyKey: { key: 'transfer-key-1' }
                }));

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Invalid idempotency key');
        });

        test('should reject idempotency key longer than 128 characters', async () => {
            const response = await request(app)
                .post('/transactions')
                .send(validRequest({ idempotencyKey: 'a'.repeat(129) }));

            expect(response.status).toBe(400);
        });

        test('should reject same sender and receiver accounts', async () => {
            const response = await request(app)
                .post('/transactions')
                .send(validRequest({ toAccount: senderId }));

            expect(response.status).toBe(400);
            expect(response.body.message).toMatch(/same/i);
        });
    });

    describe('Account validation', () => {
        test('should reject when sender account does not exist', async () => {
            mockState.sender = null;

            const response = await request(app)
                .post('/transactions')
                .send(validRequest());

            expect(response.status).toBe(404);
        });

        test('should reject when receiver account does not exist', async () => {
            mockState.accounts = [createAccount(senderId, userId)];

            const response = await request(app)
                .post('/transactions')
                .send(validRequest());

            expect(response.status).toBe(404);
        });

        test('should reject when sender account is missing from locked accounts', async () => {
            mockState.accounts = [
                createAccount(
                    receiverId,
                    '507f1f77bcf86cd799439014'
                )
            ];

            const response = await request(app)
                .post('/transactions')
                .send(validRequest());

            expect(response.status).toBe(404);
            expect(response.body.message).toBe('Sender account not found');
        });

        test('should reject sender account belonging to another user', async () => {
            mockState.accounts = [
                createAccount(senderId, '507f1f77bcf86cd799439014'),
                createAccount(receiverId, '507f1f77bcf86cd799439015')
            ];

            const response = await request(app)
                .post('/transactions')
                .send(validRequest());

            expect(response.status).toBe(403);
        });

        test('should reject frozen sender account', async () => {
            mockState.accounts = [
                createAccount(senderId, userId, 'FROZEN'),
                createAccount(receiverId, '507f1f77bcf86cd799439014')
            ];

            const response = await request(app)
                .post('/transactions')
                .send(validRequest());

            expect(response.status).toBe(400);
        });

        test('should reject frozen receiver account', async () => {
            mockState.accounts = [
                createAccount(senderId, userId),
                createAccount(receiverId, '507f1f77bcf86cd799439014', 'FROZEN')
            ];

            const response = await request(app)
                .post('/transactions')
                .send(validRequest());

            expect(response.status).toBe(400);
        });

        test('should reject currency mismatch', async () => {
            mockState.accounts[1].currency = 'USD';

            const response = await request(app)
                .post('/transactions')
                .send(validRequest());

            expect(response.status).toBe(400);
            expect(response.body.message).toMatch(/currency/i);
        });
    });

    describe('Balance validation', () => {
        test('should reject insufficient balance', async () => {
            mockState.balance = 50;

            const response = await request(app)
                .post('/transactions')
                .send(validRequest());

            expect(response.status).toBe(400);
            expect(response.body.message).toMatch(/insufficient balance/i);
        });

        test('should accept transfer when balance equals amount', async () => {
            mockState.balance = 100;

            const response = await request(app)
                .post('/transactions')
                .send(validRequest());

            expect(response.status).toBe(201);
        });
    });

    describe('Successful transaction', () => {
        test('should complete a transaction successfully', async () => {
            const response = await request(app)
                .post('/transactions')
                .send(validRequest());

            expect(response.status).toBe(201);
            expect(response.body.message).toBe(
                'Transaction completed successfully'
            );
            expect(response.body.transaction.status).toBe('COMPLETED');
        });

        test('should create exactly two ledger entries', async () => {
            const response = await request(app)
                .post('/transactions')
                .send(validRequest());

            expect(response.status).toBe(201);
            expect(ledgerModel.create).toHaveBeenCalledTimes(2);

            expect(ledgerModel.create).toHaveBeenNthCalledWith(
                1,
                [{
                    account: senderId,
                    amount: 100,
                    transaction: 'transaction123',
                    type: 'DEBIT'
                }],
                expect.objectContaining({
                    session: expect.any(Object)
                })
            );

            expect(ledgerModel.create).toHaveBeenNthCalledWith(
                2,
                [{
                    account: receiverId,
                    amount: 100,
                    transaction: 'transaction123',
                    type: 'CREDIT'
                }],
                expect.objectContaining({
                    session: expect.any(Object)
                })
            );
        });

        test('should save transaction as PENDING and then COMPLETED', async () => {
            await request(app)
                .post('/transactions')
                .send(validRequest());

            const transaction = mockTransactionConstructor.mock.calls[0][0];

            expect(transaction.save).toHaveBeenCalledTimes(2);
            expect(transaction.status).toBe('COMPLETED');
        });

        test('should normalize idempotency key', async () => {
            await request(app)
                .post('/transactions')
                .send(validRequest({ idempotencyKey: '  key-123  ' }));

            const transaction = mockTransactionConstructor.mock.calls[0][0];

            expect(transaction.idempotencyKey).toBe('key-123');
        });

        test('should increment account transaction versions', async () => {
            await request(app)
                .post('/transactions')
                .send(validRequest());

            expect(accountModel.findOneAndUpdate).toHaveBeenCalledTimes(2);

            expect(accountModel.findOneAndUpdate).toHaveBeenCalledWith(
                expect.objectContaining({ status: 'ACTIVE' }),
                { $inc: { transactionVersion: 1 } },
                expect.objectContaining({
                    session: expect.any(Object)
                })
            );
        });

        test('should end MongoDB session after success', async () => {
            await request(app)
                .post('/transactions')
                .send(validRequest());

            expect(mongoose.startSession).toHaveBeenCalledTimes(1);
            expect(mockState.endSession).toHaveBeenCalledTimes(1);
        });

        test('should send both transaction notification emails', async () => {
            await request(app)
                .post('/transactions')
                .send(validRequest());

            expect(emailService.sendTransactionEmail).toHaveBeenCalledTimes(1);
            expect(emailService.sendMoneyReceivedEmail).toHaveBeenCalledTimes(1);
        });

        test('should skip receiver email when receiver has no populated user', async () => {
            mockState.receiverUser = null;

            const response = await request(app)
                .post('/transactions')
                .send(validRequest());

            expect(response.status).toBe(201);
            expect(emailService.sendTransactionEmail).toHaveBeenCalledTimes(1);
            expect(emailService.sendMoneyReceivedEmail).not.toHaveBeenCalled();
        });
    });

    describe('Idempotency', () => {
        test('should return existing completed transaction', async () => {
            mockState.existingTransaction = createExistingTransaction();

            const response = await request(app)
                .post('/transactions')
                .send(validRequest());

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Transaction already processed');
        });

        test('should return 202 for existing pending transaction', async () => {
            mockState.existingTransaction = createExistingTransaction({
                status: 'PENDING'
            });

            const response = await request(app)
                .post('/transactions')
                .send(validRequest());

            expect(response.status).toBe(202);
        });

        test('should reject existing transaction with FAILED status', async () => {
            mockState.existingTransaction = createExistingTransaction({
                status: 'FAILED'
            });

            const response = await request(app)
                .post('/transactions')
                .send(validRequest());

            expect(response.status).toBe(409);
            expect(response.body.message)
                .toBe('This transaction cannot be processed again');
        });

        test('should reject reused key with different request', async () => {
            mockState.existingTransaction = createExistingTransaction({
                amount: 200
            });

            const response = await request(app)
                .post('/transactions')
                .send(validRequest());

            expect(response.status).toBe(409);
        });

        test('should reject legacy idempotency key', async () => {
            mockState.legacyTransaction = {
                _id: 'legacy123'
            };

            const response = await request(app)
                .post('/transactions')
                .send(validRequest());

            expect(response.status).toBe(409);
        });

        test('should return existing transaction after duplicate-key error when request matches', async () => {
            mockState.transactionSaveError = createDuplicateKeyError();
            mockState.duplicateTransaction = createExistingTransaction();

            const response = await request(app)
                .post('/transactions')
                .send(validRequest());

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Transaction already processed');
            expect(mockState.endSession).toHaveBeenCalledTimes(1);
        });

        test('should return 409 after duplicate-key error when request differs', async () => {
            mockState.transactionSaveError = createDuplicateKeyError();

            mockState.duplicateTransaction = createExistingTransaction({
                amount: 200
            });

            const response = await request(app)
                .post('/transactions')
                .send(validRequest());

            expect(response.status).toBe(409);
            expect(response.body.message).toBe(
                'This idempotency key has already been used'
            );
            expect(mockState.endSession).toHaveBeenCalledTimes(1);
        });

        test('should return 409 after duplicate-key error when transaction is not found', async () => {
            mockState.transactionSaveError = createDuplicateKeyError();
            mockState.duplicateTransaction = null;

            const response = await request(app)
                .post('/transactions')
                .send(validRequest());

            expect(response.status).toBe(409);
            expect(response.body.message).toBe(
                'This idempotency key has already been used'
            );
            expect(mockState.endSession).toHaveBeenCalledTimes(1);
        });
    });

    describe('Transaction failures', () => {
        test('should return 500 when MongoDB session creation fails', async () => {
            mockState.sessionCreationError = new Error(
                'Session creation failure'
            );

            const response = await request(app)
                .post('/transactions')
                .send(validRequest());

            expect(response.status).toBe(500);
            expect(response.body.message).toMatch(/transaction failed/i);
            expect(mongoose.startSession).toHaveBeenCalledTimes(1);
            expect(mockState.endSession).not.toHaveBeenCalled();
        });

        test('should return 500 when MongoDB transaction fails', async () => {
            mockState.sessionError = new Error('Database failure');

            const response = await request(app)
                .post('/transactions')
                .send(validRequest());

            expect(response.status).toBe(500);
            expect(response.body.message).toMatch(/transaction failed/i);
        });

        test('should return 500 when ledger creation fails', async () => {
            mockState.ledgerCreateError = new Error('Ledger failure');

            const response = await request(app)
                .post('/transactions')
                .send(validRequest());

            expect(response.status).toBe(500);
            expect(response.body.message).toMatch(/transaction failed/i);
        });

        test('should return 500 when transaction save fails', async () => {
            mockState.transactionSaveError = new Error('Save failure');

            const response = await request(app)
                .post('/transactions')
                .send(validRequest());

            expect(response.status).toBe(500);
        });

        test('should reject when account locking fails', async () => {
            mockState.accountUpdateResult = false;

            const response = await request(app)
                .post('/transactions')
                .send(validRequest());

            expect(response.status).toBe(400);
        });

        test('should not fail transaction when sender email fails', async () => {
            mockState.emailError = new Error('Email failure');

            const response = await request(app)
                .post('/transactions')
                .send(validRequest());

            expect(response.status).toBe(201);
        });

        test('should not fail transaction when receiver email fails', async () => {
            mockState.receiverEmailError = new Error('Email failure');

            const response = await request(app)
                .post('/transactions')
                .send(validRequest());

            expect(response.status).toBe(201);
        });
    });
});
