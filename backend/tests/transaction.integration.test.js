
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'backend-ledger-integration-test-secret';

jest.mock('../src/services/email.service', () => ({
    sendTransactionEmail: jest.fn().mockResolvedValue(undefined),
    sendMoneyReceivedEmail: jest.fn().mockResolvedValue(undefined)
}));

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const request = require('supertest');

const app = require('../src/app');

const User = require('../src/models/user.model');
const Account = require('../src/models/account.model');
const Transaction = require('../src/models/transaction.model');
const Ledger = require('../src/models/ledger.model');
const Blacklist = require('../src/models/blackList.model');

const TEST_MONGO_URI =
    'mongodb://127.0.0.1:27018/backend_ledger_integration_test?replicaSet=rs0&directConnection=true';

let sender;
let receiver;
let senderAccount;
let receiverAccount;
let authToken;

jest.setTimeout(30000);

async function createOpeningCredit(account, user, amount, key) {
    const openingTransaction = await Transaction.create({
        fromAccount: account._id,
        toAccount: account._id,
        initiatedBy: user._id,
        amount,
        idempotencyKey: key,
        status: 'COMPLETED'
    });

    await Ledger.create({
        account: account._id,
        amount,
        transaction: openingTransaction._id,
        type: 'CREDIT'
    });
}

beforeAll(async () => {
    await mongoose.connect(TEST_MONGO_URI);

    // This is a dedicated integration-test database.
    await mongoose.connection.dropDatabase();

    await Promise.all([
        User.init(),
        Account.init(),
        Transaction.init(),
        Ledger.init(),
        Blacklist.init()
    ]);

    sender = await User.create({
        name: 'Integration Sender',
        email: 'integration-sender@example.com',
        password: 'test-password-123'
    });

    receiver = await User.create({
        name: 'Integration Receiver',
        email: 'integration-receiver@example.com',
        password: 'test-password-123'
    });

    senderAccount = await Account.create({
        user: sender._id,
        name: 'Sender Primary',
        currency: 'INR',
        status: 'ACTIVE'
    });

    receiverAccount = await Account.create({
        user: receiver._id,
        name: 'Receiver Primary',
        currency: 'INR',
        status: 'ACTIVE'
    });

    await createOpeningCredit(
        senderAccount,
        sender,
        500,
        'opening-sender-credit'
    );

    await createOpeningCredit(
        receiverAccount,
        receiver,
        100,
        'opening-receiver-credit'
    );

    authToken = jwt.sign(
        { userId: sender._id.toString() },
        process.env.JWT_SECRET,
        {
            expiresIn: '1h',
            algorithm: 'HS256'
        }
    );
});

afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
        await mongoose.connection.dropDatabase();
        await mongoose.disconnect();
    }
});

describe('Transaction API integration tests', () => {
    test('should transfer money and create correct ledger entries', async () => {
        const response = await request(app)
            .post('/api/transactions')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                fromAccount: senderAccount._id.toString(),
                toAccount: receiverAccount._id.toString(),
                amount: 125.75,
                idempotencyKey: 'integration-transfer-001'
            });

        expect(response.status).toBe(201);
        expect(response.body.message).toBe(
            'Transaction completed successfully'
        );
        expect(response.body.transaction.status).toBe('COMPLETED');

        const transaction = await Transaction.findOne({
            idempotencyKey: 'integration-transfer-001'
        });

        expect(transaction).not.toBeNull();
        expect(transaction.amount).toBe(125.75);

        const ledgerEntries = await Ledger.find({
            transaction: transaction._id
        });

        expect(ledgerEntries).toHaveLength(2);

        expect(ledgerEntries).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    type: 'DEBIT',
                    amount: 125.75
                }),
                expect.objectContaining({
                    type: 'CREDIT',
                    amount: 125.75
                })
            ])
        );

        const updatedSender = await Account.findById(senderAccount._id);
        const updatedReceiver = await Account.findById(receiverAccount._id);

        expect(await updatedSender.getBalance()).toBe(374.25);
        expect(await updatedReceiver.getBalance()).toBe(225.75);
    });

    test('should not process the same idempotency key twice', async () => {
        const response = await request(app)
            .post('/api/transactions')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                fromAccount: senderAccount._id.toString(),
                toAccount: receiverAccount._id.toString(),
                amount: 125.75,
                idempotencyKey: 'integration-transfer-001'
            });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe(
            'Transaction already processed'
        );

        const transactions = await Transaction.find({
            initiatedBy: sender._id,
            idempotencyKey: 'integration-transfer-001'
        });

        expect(transactions).toHaveLength(1);

        const updatedSender = await Account.findById(senderAccount._id);
        const updatedReceiver = await Account.findById(receiverAccount._id);

        expect(await updatedSender.getBalance()).toBe(374.25);
        expect(await updatedReceiver.getBalance()).toBe(225.75);
    });

    test('should reject insufficient balance without changing balances', async () => {
        const response = await request(app)
            .post('/api/transactions')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                fromAccount: senderAccount._id.toString(),
                toAccount: receiverAccount._id.toString(),
                amount: 1000,
                idempotencyKey: 'integration-insufficient-001'
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('Insufficient balance');

        const transaction = await Transaction.findOne({
            idempotencyKey: 'integration-insufficient-001'
        });

        expect(transaction).toBeNull();

        const updatedSender = await Account.findById(senderAccount._id);
        const updatedReceiver = await Account.findById(receiverAccount._id);

        expect(await updatedSender.getBalance()).toBe(374.25);
        expect(await updatedReceiver.getBalance()).toBe(225.75);
    });

    test('should prevent concurrent transfers from exceeding available balance', async () => {
        const makeTransfer = (idempotencyKey) => {
            return request(app)
                .post('/api/transactions')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    fromAccount: senderAccount._id.toString(),
                    toAccount: receiverAccount._id.toString(),
                    amount: 200,
                    idempotencyKey
                });
        };

        const responses = await Promise.all([
            makeTransfer('integration-concurrent-001'),
            makeTransfer('integration-concurrent-002')
        ]);

        const successfulResponses = responses.filter(
            response => response.status === 201
        );

        const rejectedResponses = responses.filter(
            response => response.status === 400
        );

        expect(successfulResponses).toHaveLength(1);
        expect(rejectedResponses).toHaveLength(1);

        expect(rejectedResponses[0].body.message).toContain(
            'Insufficient balance'
        );

        const concurrentTransactions = await Transaction.find({
            initiatedBy: sender._id,
            idempotencyKey: {
                $in: [
                    'integration-concurrent-001',
                    'integration-concurrent-002'
                ]
            }
        });

        expect(concurrentTransactions).toHaveLength(1);
        expect(concurrentTransactions[0].status).toBe('COMPLETED');

        const concurrentLedgerEntries = await Ledger.find({
            transaction: concurrentTransactions[0]._id
        });

        expect(concurrentLedgerEntries).toHaveLength(2);

        const updatedSender = await Account.findById(senderAccount._id);
        const updatedReceiver = await Account.findById(receiverAccount._id);

        expect(await updatedSender.getBalance()).toBe(174.25);
        expect(await updatedReceiver.getBalance()).toBe(425.75);
    });
});
