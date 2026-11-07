
jest.mock('../src/models/ledger.model', () => ({
    aggregate: jest.fn(),
}));

const mongoose = require('mongoose');
const ledgerModel = require('../src/models/ledger.model');
const accountModel = require('../src/models/account.model');

function mockAggregate(data) {
    const query = Promise.resolve(data);

    query.session = jest.fn().mockReturnValue(query);

    ledgerModel.aggregate.mockReturnValue(query);

    return query;
}

describe('Account Model Tests', () => {
    let validUserId;

    beforeEach(() => {
        jest.clearAllMocks();
        validUserId = new mongoose.Types.ObjectId();
    });

    describe('Schema Defaults', () => {
        test('should set default status to ACTIVE', () => {
            const account = new accountModel({
                user: validUserId,
                name: 'Primary Account'
            });

            expect(account.status).toBe('ACTIVE');
        });

        test('should set default currency to INR', () => {
            const account = new accountModel({
                user: validUserId,
                name: 'Primary Account'
            });

            expect(account.currency).toBe('INR');
        });

        test('should set transactionVersion to 0 by default', () => {
            const account = new accountModel({
                user: validUserId,
                name: 'Primary Account'
            });

            expect(account.transactionVersion).toBe(0);
        });

        test('should automatically create timestamps', () => {
            const account = new accountModel({
                user: validUserId,
                name: 'Primary Account'
            });

            expect(accountSchemaTimestamps()).toBe(true);
        });
    });

    describe('Schema Validation', () => {
        test('should create a valid account', async () => {
            const account = new accountModel({
                user: validUserId,
                name: 'Primary Account',
                status: 'ACTIVE',
                currency: 'INR',
            });

            await expect(account.validate()).resolves.toBeUndefined();
        });

        test('should reject account without user', async () => {
            const account = new accountModel({
                name: 'Primary Account',
                currency: 'INR',
            });

            await expect(account.validate()).rejects.toThrow();
        });

        test('should reject invalid account status', async () => {
            const account = new accountModel({
                user: validUserId,
                name: 'Primary Account',
                status: 'INVALID',
            });

            await expect(account.validate()).rejects.toThrow();
        });

        test('should reject account without currency', async () => {
            const account = new accountModel({
                user: validUserId,
                name: 'Primary Account',
                currency: null,
            });

            await expect(account.validate()).rejects.toThrow();
        });

        test('should reject negative transactionVersion', async () => {
            const account = new accountModel({
                user: validUserId,
                name: 'Primary Account',
                transactionVersion: -1,
            });

            await expect(account.validate()).rejects.toThrow();
        });
    });

    describe('Schema Configuration', () => {
        test('should hide transactionVersion from normal queries', () => {
            expect(
                accountModel.schema.path('transactionVersion').options.select
            ).toBe(false);
        });

        test('should define user and status compound index', () => {
            const indexes = accountModel.schema.indexes();

            expect(indexes).toContainEqual([
                { user: 1, status: 1 },
                {},
            ]);
        });
    });

    describe('getBalance', () => {
        test('should return calculated balance from ledger', async () => {
            mockAggregate([{ balance: 750 }]);

            const account = new accountModel({
                user: validUserId,
                name: 'Primary Account'
            });

            const balance = await account.getBalance();

            expect(balance).toBe(750);
            expect(ledgerModel.aggregate).toHaveBeenCalledTimes(1);
        });

        test('should return zero when ledger has no entries', async () => {
            mockAggregate([]);

            const account = new accountModel({
                user: validUserId,
                name: 'Primary Account'
            });

            const balance = await account.getBalance();

            expect(balance).toBe(0);
        });

        test('should aggregate ledger entries for the current account', async () => {
            mockAggregate([{ balance: 500 }]);

            const account = new accountModel({
                user: validUserId,
                name: 'Primary Account'
            });

            await account.getBalance();

            const pipeline = ledgerModel.aggregate.mock.calls[0][0];

            expect(pipeline[0]).toEqual({
                $match: {
                    account: account._id,
                },
            });
        });

        test('should use MongoDB session when provided', async () => {
            const query = mockAggregate([{ balance: 300 }]);

            const account = new accountModel({
                user: validUserId,
                name: 'Primary Account'
            });

            const session = {
                id: 'test-session',
            };

            const balance = await account.getBalance({ session });

            expect(balance).toBe(300);
            expect(query.session).toHaveBeenCalledWith(session);
        });

        test('should not attach a session when no session is provided', async () => {
            const query = mockAggregate([{ balance: 200 }]);

            const account = new accountModel({
                user: validUserId,
                name: 'Primary Account'
            });

            await account.getBalance();

            expect(query.session).not.toHaveBeenCalled();
        });

        test('should propagate ledger aggregation errors', async () => {
            ledgerModel.aggregate.mockRejectedValue(
                new Error('Ledger aggregation failed')
            );

            const account = new accountModel({
                user: validUserId,
                name: 'Primary Account'
            });

            await expect(account.getBalance()).rejects.toThrow(
                'Ledger aggregation failed'
            );
        });
    });
});

function accountSchemaTimestamps() {
    return (
        accountModel.schema.options.timestamps === true
    );
}
