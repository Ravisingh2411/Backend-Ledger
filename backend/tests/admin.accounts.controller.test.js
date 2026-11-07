const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');

jest.mock('../src/models/user.model', () => ({
    findOne: jest.fn()
}));

jest.mock('../src/models/account.model', () => ({
    aggregate: jest.fn(),
    findById: jest.fn(),
    findOneAndUpdate: jest.fn()
}));

jest.mock('../src/models/transaction.model', () => ({}));

jest.mock('../src/models/ledger.model', () => ({
    aggregate: jest.fn()
}));

const User = require('../src/models/user.model');
const Account = require('../src/models/account.model');
const Ledger = require('../src/models/ledger.model');

const {
    getAdminAccountsController,
    getAdminAccountDetailsController,
    updateAdminAccountStatusController
} = require('../src/controllers/admin.controller');

const app = express();
app.use(express.json());

app.get('/api/admin/accounts', getAdminAccountsController);
app.get('/api/admin/accounts/:accountId', getAdminAccountDetailsController);
app.patch(
    '/api/admin/accounts/:accountId/status',
    updateAdminAccountStatusController
);

const accountId = '507f1f77bcf86cd799439011';
const ownerId = '507f1f77bcf86cd799439012';

const createQuery = result => ({
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
    session: jest.fn().mockResolvedValue(result)
});

const createSession = () => ({
    withTransaction: jest.fn(async callback => callback()),
    endSession: jest.fn().mockResolvedValue(undefined)
});

describe('Admin Accounts Controller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/admin/accounts', () => {
        test('should return paginated customer accounts with ledger balances', async () => {
            Account.aggregate.mockResolvedValue([
                {
                    metadata: [{ total: 1 }],
                    accounts: [
                        {
                            _id: accountId,
                            name: 'Primary Account',
                            status: 'ACTIVE',
                            currency: 'INR',
                            owner: {
                                _id: ownerId,
                                name: 'Ravi Singh',
                                email: 'ravi@example.com'
                            },
                            createdAt: new Date('2026-01-01'),
                            updatedAt: new Date('2026-01-02')
                        }
                    ]
                }
            ]);

            Ledger.aggregate.mockResolvedValue([
                {
                    _id: accountId,
                    credits: 1000,
                    debits: 250
                }
            ]);

            const response = await request(app)
                .get('/api/admin/accounts');

            expect(response.status).toBe(200);
            expect(response.body.message).toBe(
                'Accounts fetched successfully.'
            );

            expect(response.body.accounts).toHaveLength(1);

            expect(response.body.accounts[0]).toMatchObject({
                _id: accountId,
                name: 'Primary Account',
                status: 'ACTIVE',
                currency: 'INR',
                balance: 750,
                owner: {
                    _id: ownerId,
                    name: 'Ravi Singh',
                    email: 'ravi@example.com'
                }
            });

            expect(response.body.pagination).toEqual({
                page: 1,
                limit: 10,
                total: 1,
                totalPages: 1,
                hasNextPage: false,
                hasPreviousPage: false
            });

            const pipeline = Account.aggregate.mock.calls[0][0];

            expect(pipeline).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        $lookup: expect.objectContaining({
                            from: 'users'
                        })
                    }),
                    {
                        $unwind: '$owner'
                    }
                ])
            );

            expect(Ledger.aggregate).toHaveBeenCalled();
        });

        test('should apply status filter', async () => {
            Account.aggregate.mockResolvedValue([
                {
                    metadata: [],
                    accounts: []
                }
            ]);

            const response = await request(app)
                .get('/api/admin/accounts?status=FROZEN');

            expect(response.status).toBe(200);

            const pipeline = Account.aggregate.mock.calls[0][0];

            expect(pipeline).toEqual(
                expect.arrayContaining([
                    {
                        $match: expect.objectContaining({
                            status: 'FROZEN'
                        })
                    }
                ])
            );

            expect(Ledger.aggregate).not.toHaveBeenCalled();
        });

        test('should reject invalid status filter', async () => {
            const response = await request(app)
                .get('/api/admin/accounts?status=INVALID');

            expect(response.status).toBe(400);
            expect(Account.aggregate).not.toHaveBeenCalled();
        });

        test('should reject invalid pagination', async () => {
            const response = await request(app)
                .get('/api/admin/accounts?page=0&limit=101');

            expect(response.status).toBe(400);
            expect(Account.aggregate).not.toHaveBeenCalled();
        });

        test('should return 500 when account listing query fails', async () => {
            Account.aggregate.mockRejectedValue(
                new Error('Database connection failed')
            );

            const response = await request(app)
                .get('/api/admin/accounts');

            expect(response.status).toBe(500);
            expect(response.body.message).toBe(
                'Unable to fetch accounts.'
            );
        });
    });

    describe('GET /api/admin/accounts/:accountId', () => {
        test('should return account details with ledger-derived balance', async () => {
            const account = {
                _id: accountId,
                user: ownerId,
                name: 'Primary Account',
                status: 'ACTIVE',
                currency: 'INR',
                createdAt: new Date('2026-01-01'),
                updatedAt: new Date('2026-01-02'),
                getBalance: jest.fn().mockResolvedValue(1500)
            };

            const owner = {
                _id: ownerId,
                name: 'Ravi Singh',
                email: 'ravi@example.com'
            };

            Account.findById.mockResolvedValue(account);
            User.findOne.mockReturnValue(createQuery(owner));

            const response = await request(app)
                .get(`/api/admin/accounts/${accountId}`);

            expect(response.status).toBe(200);

            expect(response.body.account).toMatchObject({
                _id: accountId,
                name: 'Primary Account',
                status: 'ACTIVE',
                currency: 'INR',
                balance: 1500,
                owner
            });

            expect(account.getBalance).toHaveBeenCalledTimes(1);
        });

        test('should reject invalid account ID', async () => {
            const response = await request(app)
                .get('/api/admin/accounts/invalid-id');

            expect(response.status).toBe(400);
            expect(Account.findById).not.toHaveBeenCalled();
        });

        test('should return 404 when account does not exist', async () => {
            Account.findById.mockResolvedValue(null);

            const response = await request(app)
                .get(`/api/admin/accounts/${accountId}`);

            expect(response.status).toBe(404);
            expect(response.body.message).toBe('Account not found.');
        });

        test('should not expose internal system accounts', async () => {
            Account.findById.mockResolvedValue({
                _id: accountId,
                user: ownerId
            });

            User.findOne.mockReturnValue(createQuery(null));

            const response = await request(app)
                .get(`/api/admin/accounts/${accountId}`);

            expect(response.status).toBe(404);
        });
    });

    describe('PATCH /api/admin/accounts/:accountId/status', () => {
        let session;

        beforeEach(() => {
            session = createSession();
            jest.spyOn(mongoose, 'startSession')
                .mockResolvedValue(session);
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        const setupStatusUpdate = ({
            currentStatus = 'ACTIVE',
            targetStatus = 'FROZEN',
            balance = 0,
            updatedStatus = targetStatus,
            updateResult = true
        } = {}) => {
            const account = {
                _id: accountId,
                user: ownerId,
                status: currentStatus,
                transactionVersion: 3,
                getBalance: jest.fn().mockResolvedValue(balance)
            };

            const updatedAccount = {
                _id: accountId,
                name: 'Primary Account',
                status: updatedStatus,
                currency: 'INR',
                updatedAt: new Date('2026-01-03')
            };

            Account.findById.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                session: jest.fn().mockResolvedValue(account)
            });

            User.findOne.mockReturnValue(createQuery({
                _id: ownerId
            }));

            Account.findOneAndUpdate.mockResolvedValue(
                updateResult ? updatedAccount : null
            );

            return { account, updatedAccount, targetStatus };
        };

        test('should freeze an active customer account', async () => {
            const { updatedAccount } = setupStatusUpdate();

            const response = await request(app)
                .patch(`/api/admin/accounts/${accountId}/status`)
                .send({ status: 'FROZEN' });

            expect(response.status).toBe(200);
            expect(response.body.account.status).toBe('FROZEN');

            expect(Account.findOneAndUpdate).toHaveBeenCalledWith(
                {
                    _id: accountId,
                    status: 'ACTIVE',
                    transactionVersion: 3
                },
                {
                    $set: {
                        status: 'FROZEN'
                    },
                    $inc: {
                        transactionVersion: 1
                    }
                },
                {
                    new: true,
                    session,
                    runValidators: true
                }
            );

            expect(session.endSession).toHaveBeenCalledTimes(1);
            expect(updatedAccount.status).toBe('FROZEN');
        });

        test('should unfreeze a frozen customer account', async () => {
            setupStatusUpdate({
                currentStatus: 'FROZEN',
                targetStatus: 'ACTIVE'
            });

            const response = await request(app)
                .patch(`/api/admin/accounts/${accountId}/status`)
                .send({ status: 'ACTIVE' });

            expect(response.status).toBe(200);
            expect(response.body.account.status).toBe('ACTIVE');
        });

        test('should close an account only when its balance is zero', async () => {
            const { account } = setupStatusUpdate({
                currentStatus: 'FROZEN',
                targetStatus: 'CLOSED',
                balance: 0
            });

            const response = await request(app)
                .patch(`/api/admin/accounts/${accountId}/status`)
                .send({ status: 'CLOSED' });

            expect(response.status).toBe(200);
            expect(response.body.account.status).toBe('CLOSED');
            expect(account.getBalance).toHaveBeenCalledWith({ session });
        });

        test('should prevent closing an account with non-zero balance', async () => {
            const { account } = setupStatusUpdate({
                currentStatus: 'ACTIVE',
                targetStatus: 'CLOSED',
                balance: 500
            });

            const response = await request(app)
                .patch(`/api/admin/accounts/${accountId}/status`)
                .send({ status: 'CLOSED' });

            expect(response.status).toBe(409);
            expect(response.body.message).toBe(
                'Account can only be closed when its balance is zero.'
            );

            expect(account.getBalance).toHaveBeenCalled();
            expect(Account.findOneAndUpdate).not.toHaveBeenCalled();
            expect(session.endSession).toHaveBeenCalled();
        });

        test('should reject invalid target status', async () => {
            const response = await request(app)
                .patch(`/api/admin/accounts/${accountId}/status`)
                .send({ status: 'INVALID' });

            expect(response.status).toBe(400);
            expect(mongoose.startSession).not.toHaveBeenCalled();
        });

        test('should reject invalid account ID', async () => {
            const response = await request(app)
                .patch('/api/admin/accounts/invalid-id/status')
                .send({ status: 'FROZEN' });

            expect(response.status).toBe(400);
            expect(mongoose.startSession).not.toHaveBeenCalled();
        });

        test('should return 404 when account does not exist', async () => {
            Account.findById.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                session: jest.fn().mockResolvedValue(null)
            });

            const response = await request(app)
                .patch(`/api/admin/accounts/${accountId}/status`)
                .send({ status: 'FROZEN' });

            expect(response.status).toBe(404);
            expect(session.endSession).toHaveBeenCalled();
        });

        test('should prevent invalid status transitions', async () => {
            setupStatusUpdate({
                currentStatus: 'CLOSED',
                targetStatus: 'ACTIVE'
            });

            const response = await request(app)
                .patch(`/api/admin/accounts/${accountId}/status`)
                .send({ status: 'ACTIVE' });

            expect(response.status).toBe(409);
            expect(Account.findOneAndUpdate).not.toHaveBeenCalled();
        });

        test('should return 409 when concurrent account update occurs', async () => {
            setupStatusUpdate({
                currentStatus: 'ACTIVE',
                targetStatus: 'FROZEN',
                updateResult: false
            });

            const response = await request(app)
                .patch(`/api/admin/accounts/${accountId}/status`)
                .send({ status: 'FROZEN' });

            expect(response.status).toBe(409);
            expect(response.body.message).toBe(
                'Account changed during this operation. Please retry.'
            );
        });
    });
});