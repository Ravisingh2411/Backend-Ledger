
const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');

jest.mock('../src/models/account.model', () => ({
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn()
}));

const accountModel = require('../src/models/account.model');

const {
    createAccountController,
    getUserAccountsController,
    getAccountBalanceController,
    freezeAccountController,
    unfreezeAccountController,
    closeAccountController
} = require('../src/controllers/account.controller');

const USER_ID = '507f1f77bcf86cd799439011';
const ACCOUNT_ID = '507f191e810c19729de860ea';

function createSession() {
    return {
        withTransaction: jest.fn(async callback => callback()),
        endSession: jest.fn().mockResolvedValue(undefined)
    };
}

function createApp() {
    const app = express();

    app.use(express.json());

    app.use((req, res, next) => {
        req.user = { _id: USER_ID };
        next();
    });

    app.post('/accounts', createAccountController);
    app.get('/accounts', getUserAccountsController);
    app.get('/accounts/balance/:accountId', getAccountBalanceController);

    app.patch('/accounts/:accountId/freeze', freezeAccountController);
    app.patch('/accounts/:accountId/unfreeze', unfreezeAccountController);
    app.patch('/accounts/:accountId/close', closeAccountController);

    return app;
}

describe('Account Controller Tests', () => {
    const app = createApp();

    let session;

    beforeEach(() => {
        jest.clearAllMocks();

        session = createSession();

        jest.spyOn(mongoose, 'startSession')
            .mockResolvedValue(session);

        jest.spyOn(console, 'error')
            .mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // CREATE ACCOUNT

    test('should create a new account successfully', async () => {
        const mockAccount = {
            _id: ACCOUNT_ID,
            user: USER_ID,
            name: 'Primary Account',
            status: 'ACTIVE',
            currency: 'INR'
        };

        accountModel.create.mockResolvedValue(mockAccount);

        const response = await request(app)
            .post('/accounts')
            .send({ name: 'Primary Account' });

        expect(response.statusCode).toBe(201);
        expect(response.body.message).toBe('Account created successfully');
        expect(response.body.account).toEqual(mockAccount);

        expect(accountModel.create).toHaveBeenCalledWith({
            user: USER_ID,
            name: 'Primary Account',
            currency: 'INR'
        });
    });

    test('should return 400 when account name is missing', async () => {
        const response = await request(app)
            .post('/accounts')
            .send({});

        expect(response.statusCode).toBe(400);
        expect(response.body.message)
            .toBe('Account name must be between 2 and 30 characters');

        expect(accountModel.create).not.toHaveBeenCalled();
    });

    test('should return 400 when account name is too short', async () => {
        const response = await request(app)
            .post('/accounts')
            .send({ name: 'A' });

        expect(response.statusCode).toBe(400);
        expect(accountModel.create).not.toHaveBeenCalled();
    });

    test('should return 500 when account creation fails', async () => {
        accountModel.create.mockRejectedValue(
            new Error('Database error')
        );

        const response = await request(app)
            .post('/accounts')
            .send({ name: 'Primary Account' });

        expect(response.statusCode).toBe(500);
        expect(accountModel.create).toHaveBeenCalledTimes(1);
    });

    // GET USER ACCOUNTS

    test('should return accounts belonging to logged-in user', async () => {
        const mockAccounts = [
            { _id: ACCOUNT_ID, user: USER_ID, status: 'ACTIVE' }
        ];

        const sort = jest.fn().mockResolvedValue(mockAccounts);

        accountModel.find.mockReturnValue({ sort });

        const response = await request(app)
            .get('/accounts');

        expect(response.statusCode).toBe(200);
        expect(response.body.accounts).toEqual(mockAccounts);

        expect(accountModel.find).toHaveBeenCalledWith({
            user: USER_ID
        });

        expect(sort).toHaveBeenCalledWith({
            createdAt: -1
        });
    });

    test('should return empty array when user has no accounts', async () => {
        accountModel.find.mockReturnValue({
            sort: jest.fn().mockResolvedValue([])
        });

        const response = await request(app)
            .get('/accounts');

        expect(response.statusCode).toBe(200);
        expect(response.body.accounts).toEqual([]);
    });

    test('should handle database error while fetching accounts', async () => {
        accountModel.find.mockReturnValue({
            sort: jest.fn().mockRejectedValue(
                new Error('Database error')
            )
        });

        const response = await request(app)
            .get('/accounts');

        expect(response.statusCode).toBe(500);
    });

    // GET ACCOUNT BALANCE

    test('should return account balance successfully', async () => {
        const mockAccount = {
            _id: ACCOUNT_ID,
            getBalance: jest.fn().mockResolvedValue(5000)
        };

        accountModel.findOne.mockResolvedValue(mockAccount);

        const response = await request(app)
            .get(`/accounts/balance/${ACCOUNT_ID}`);

        expect(response.statusCode).toBe(200);

        expect(response.body).toEqual({
            accountId: ACCOUNT_ID,
            balance: 5000
        });

        expect(accountModel.findOne).toHaveBeenCalledWith({
            _id: ACCOUNT_ID,
            user: USER_ID
        });

        expect(mockAccount.getBalance).toHaveBeenCalled();
    });

    test('should return zero balance for empty account', async () => {
        const mockAccount = {
            _id: ACCOUNT_ID,
            getBalance: jest.fn().mockResolvedValue(0)
        };

        accountModel.findOne.mockResolvedValue(mockAccount);

        const response = await request(app)
            .get(`/accounts/balance/${ACCOUNT_ID}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.balance).toBe(0);
    });

    test('should reject invalid account ID', async () => {
        const response = await request(app)
            .get('/accounts/balance/invalid-id');

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe('Invalid account ID');

        expect(accountModel.findOne).not.toHaveBeenCalled();
    });

    test('should return 404 when account does not exist', async () => {
        accountModel.findOne.mockResolvedValue(null);

        const response = await request(app)
            .get(`/accounts/balance/${ACCOUNT_ID}`);

        expect(response.statusCode).toBe(404);
        expect(response.body.message).toBe('Account not found');
    });

    test('should handle database error while fetching balance', async () => {
        accountModel.findOne.mockRejectedValue(
            new Error('Database error')
        );

        const response = await request(app)
            .get(`/accounts/balance/${ACCOUNT_ID}`);

        expect(response.statusCode).toBe(500);
    });

    // FREEZE ACCOUNT

    test('should freeze an ACTIVE account successfully', async () => {
        const mockAccount = {
            _id: ACCOUNT_ID,
            status: 'ACTIVE'
        };

        const updatedAccount = {
            ...mockAccount,
            status: 'FROZEN'
        };

        accountModel.findOne.mockReturnValue({
            session: jest.fn().mockResolvedValue(mockAccount)
        });

        accountModel.findOneAndUpdate.mockResolvedValue(updatedAccount);

        const response = await request(app)
            .patch(`/accounts/${ACCOUNT_ID}/freeze`);

        expect(response.statusCode).toBe(200);
        expect(response.body.message).toBe('Account frozen successfully');
        expect(response.body.account.status).toBe('FROZEN');

        expect(accountModel.findOneAndUpdate).toHaveBeenCalledWith(
            {
                _id: ACCOUNT_ID,
                user: USER_ID,
                status: 'ACTIVE'
            },
            {
                $set: { status: 'FROZEN' },
                $inc: { transactionVersion: 1 }
            },
            {
                returnDocument: 'after',
                session,
                runValidators: true
            }
        );

        expect(session.endSession).toHaveBeenCalled();
    });

    test('should reject freezing an already FROZEN account', async () => {
        accountModel.findOne.mockReturnValue({
            session: jest.fn().mockResolvedValue({
                _id: ACCOUNT_ID,
                status: 'FROZEN'
            })
        });

        const response = await request(app)
            .patch(`/accounts/${ACCOUNT_ID}/freeze`);

        expect(response.statusCode).toBe(409);
        expect(response.body.message)
            .toMatch(/only active accounts can be frozen/i);

        expect(accountModel.findOneAndUpdate).not.toHaveBeenCalled();
        expect(session.endSession).toHaveBeenCalled();
    });

    test('should reject freezing a CLOSED account', async () => {
        accountModel.findOne.mockReturnValue({
            session: jest.fn().mockResolvedValue({
                _id: ACCOUNT_ID,
                status: 'CLOSED'
            })
        });

        const response = await request(app)
            .patch(`/accounts/${ACCOUNT_ID}/freeze`);

        expect(response.statusCode).toBe(409);
    });

    // UNFREEZE ACCOUNT

    test('should unfreeze a FROZEN account successfully', async () => {
        accountModel.findOne.mockReturnValue({
            session: jest.fn().mockResolvedValue({
                _id: ACCOUNT_ID,
                status: 'FROZEN'
            })
        });

        accountModel.findOneAndUpdate.mockResolvedValue({
            _id: ACCOUNT_ID,
            status: 'ACTIVE'
        });

        const response = await request(app)
            .patch(`/accounts/${ACCOUNT_ID}/unfreeze`);

        expect(response.statusCode).toBe(200);

        expect(response.body.message)
            .toBe('Account unfrozen successfully');

        expect(response.body.account.status).toBe('ACTIVE');

        expect(accountModel.findOneAndUpdate).toHaveBeenCalledWith(
            {
                _id: ACCOUNT_ID,
                user: USER_ID,
                status: 'FROZEN'
            },
            {
                $set: { status: 'ACTIVE' },
                $inc: { transactionVersion: 1 }
            },
            {
                returnDocument: 'after',
                session,
                runValidators: true
            }
        );

        expect(session.endSession).toHaveBeenCalled();
    });

    test('should return 409 when account status changes during unfreezing', async () => {
        accountModel.findOne.mockReturnValue({
            session: jest.fn().mockResolvedValue({
                _id: ACCOUNT_ID,
                status: 'FROZEN'
            })
        });

        accountModel.findOneAndUpdate.mockResolvedValue(null);

        const response = await request(app)
            .patch(`/accounts/${ACCOUNT_ID}/unfreeze`);

        expect(response.statusCode).toBe(409);

        expect(response.body.message)
            .toBe('Account status changed. Please retry.');

        expect(accountModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
        expect(session.endSession).toHaveBeenCalled();
    });

    test('should reject unfreezing an ACTIVE account', async () => {
        accountModel.findOne.mockReturnValue({
            session: jest.fn().mockResolvedValue({
                _id: ACCOUNT_ID,
                status: 'ACTIVE'
            })
        });

        const response = await request(app)
            .patch(`/accounts/${ACCOUNT_ID}/unfreeze`);

        expect(response.statusCode).toBe(409);

        expect(response.body.message)
            .toMatch(/only frozen accounts can be unfrozen/i);

        expect(accountModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    test('should reject unfreezing a CLOSED account', async () => {
        accountModel.findOne.mockReturnValue({
            session: jest.fn().mockResolvedValue({
                _id: ACCOUNT_ID,
                status: 'CLOSED'
            })
        });

        const response = await request(app)
            .patch(`/accounts/${ACCOUNT_ID}/unfreeze`);

        expect(response.statusCode).toBe(409);
    });

    // CLOSE ACCOUNT

    test('should close an ACTIVE account with zero balance', async () => {
        const lockedAccount = {
            _id: ACCOUNT_ID,
            status: 'ACTIVE',
            getBalance: jest.fn().mockResolvedValue(0)
        };

        accountModel.findOne.mockReturnValue({
            session: jest.fn().mockResolvedValue({
                _id: ACCOUNT_ID,
                status: 'ACTIVE'
            })
        });

        accountModel.findOneAndUpdate
            .mockResolvedValueOnce(lockedAccount)
            .mockResolvedValueOnce({
                _id: ACCOUNT_ID,
                status: 'CLOSED'
            });

        const response = await request(app)
            .patch(`/accounts/${ACCOUNT_ID}/close`);

        expect(response.statusCode).toBe(200);
        expect(response.body.message).toBe('Account closed successfully');
        expect(response.body.account.status).toBe('CLOSED');

        expect(lockedAccount.getBalance).toHaveBeenCalledWith({
            session
        });

        expect(accountModel.findOneAndUpdate).toHaveBeenCalledTimes(2);
        expect(session.endSession).toHaveBeenCalled();
    });

    test('should close a FROZEN account with zero balance', async () => {
        const lockedAccount = {
            _id: ACCOUNT_ID,
            status: 'FROZEN',
            getBalance: jest.fn().mockResolvedValue(0)
        };

        accountModel.findOne.mockReturnValue({
            session: jest.fn().mockResolvedValue({
                _id: ACCOUNT_ID,
                status: 'FROZEN'
            })
        });

        accountModel.findOneAndUpdate
            .mockResolvedValueOnce(lockedAccount)
            .mockResolvedValueOnce({
                _id: ACCOUNT_ID,
                status: 'CLOSED'
            });

        const response = await request(app)
            .patch(`/accounts/${ACCOUNT_ID}/close`);

        expect(response.statusCode).toBe(200);
        expect(response.body.account.status).toBe('CLOSED');
    });

    test('should reject closing account with non-zero balance', async () => {
        const lockedAccount = {
            _id: ACCOUNT_ID,
            status: 'ACTIVE',
            getBalance: jest.fn().mockResolvedValue(500)
        };

        accountModel.findOne.mockReturnValue({
            session: jest.fn().mockResolvedValue({
                _id: ACCOUNT_ID,
                status: 'ACTIVE'
            })
        });

        accountModel.findOneAndUpdate.mockResolvedValue(lockedAccount);

        const response = await request(app)
            .patch(`/accounts/${ACCOUNT_ID}/close`);

        expect(response.statusCode).toBe(409);

        expect(response.body.message)
            .toMatch(/account cannot be closed/i);

        expect(accountModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
        expect(session.endSession).toHaveBeenCalled();
    });

    test('should reject closing an already CLOSED account', async () => {
        accountModel.findOne.mockReturnValue({
            session: jest.fn().mockResolvedValue({
                _id: ACCOUNT_ID,
                status: 'CLOSED'
            })
        });

        const response = await request(app)
            .patch(`/accounts/${ACCOUNT_ID}/close`);

        expect(response.statusCode).toBe(409);
        expect(response.body.message)
            .toMatch(/this account cannot be closed/i);
    });

    test('should return 409 when account lock fails during closing', async () => {
        accountModel.findOne.mockReturnValue({
            session: jest.fn().mockResolvedValue({
                _id: ACCOUNT_ID,
                status: 'ACTIVE'
            })
        });

        accountModel.findOneAndUpdate.mockResolvedValueOnce(null);

        const response = await request(app)
            .patch(`/accounts/${ACCOUNT_ID}/close`);

        expect(response.statusCode).toBe(409);
        expect(response.body.message)
            .toMatch(/account status changed/i);

        expect(accountModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
        expect(session.endSession).toHaveBeenCalled();
    });

    test('should return 409 when final account close update fails', async () => {
        const lockedAccount = {
            _id: ACCOUNT_ID,
            status: 'ACTIVE',
            getBalance: jest.fn().mockResolvedValue(0)
        };

        accountModel.findOne.mockReturnValue({
            session: jest.fn().mockResolvedValue({
                _id: ACCOUNT_ID,
                status: 'ACTIVE'
            })
        });

        accountModel.findOneAndUpdate
            .mockResolvedValueOnce(lockedAccount)
            .mockResolvedValueOnce(null);

        const response = await request(app)
            .patch(`/accounts/${ACCOUNT_ID}/close`);

        expect(response.statusCode).toBe(409);
        expect(response.body.message)
            .toBe('Unable to close account. Please retry.');

        expect(lockedAccount.getBalance).toHaveBeenCalledWith({
            session
        });

        expect(accountModel.findOneAndUpdate).toHaveBeenCalledTimes(2);
        expect(session.endSession).toHaveBeenCalled();
    });

    // COMMON STATUS CHANGE VALIDATION

    test('should reject invalid account ID while freezing', async () => {
        const response = await request(app)
            .patch('/accounts/invalid-id/freeze');

        expect(response.statusCode).toBe(400);
        expect(accountModel.findOne).not.toHaveBeenCalled();
        expect(mongoose.startSession).not.toHaveBeenCalled();
    });

    test('should return 404 when account does not exist during status change', async () => {
        accountModel.findOne.mockReturnValue({
            session: jest.fn().mockResolvedValue(null)
        });

        const response = await request(app)
            .patch(`/accounts/${ACCOUNT_ID}/freeze`);

        expect(response.statusCode).toBe(404);
        expect(response.body.message).toBe('Account not found');
        expect(session.endSession).toHaveBeenCalled();
    });

    test('should return 409 when account status changes concurrently', async () => {
        accountModel.findOne.mockReturnValue({
            session: jest.fn().mockResolvedValue({
                _id: ACCOUNT_ID,
                status: 'ACTIVE'
            })
        });

        accountModel.findOneAndUpdate.mockResolvedValue(null);

        const response = await request(app)
            .patch(`/accounts/${ACCOUNT_ID}/freeze`);

        expect(response.statusCode).toBe(409);

        expect(response.body.message)
            .toMatch(/account status changed/i);
    });

    test('should return 500 when database transaction fails', async () => {
        session.withTransaction.mockRejectedValue(
            new Error('Transaction failed')
        );

        const response = await request(app)
            .patch(`/accounts/${ACCOUNT_ID}/freeze`);

        expect(response.statusCode).toBe(500);

        expect(response.body.message)
            .toBe('Unable to update account. Please try again later.');

        expect(session.endSession).toHaveBeenCalled();
    });
});
