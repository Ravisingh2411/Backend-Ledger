
const mongoose = require('mongoose');
const transactionModel = require('../src/models/transaction.model');

describe('Transaction Model Tests', () => {
    const validTransaction = () => ({
        fromAccount: new mongoose.Types.ObjectId(),
        toAccount: new mongoose.Types.ObjectId(),
        initiatedBy: new mongoose.Types.ObjectId(),
        amount: 100.50,
        idempotencyKey: 'transfer-123'
    });

    describe('Schema Defaults', () => {
        test('should set status to PENDING by default', () => {
            const transaction = new transactionModel(validTransaction());

            expect(transaction.status).toBe('PENDING');
        });

        test('should automatically create timestamps', () => {
            expect(transactionModel.schema.options.timestamps).toBe(true);
        });
    });

    describe('Schema Validation', () => {
        test('should create a valid transaction', async () => {
            const transaction = new transactionModel(validTransaction());

            await expect(transaction.validate()).resolves.toBeUndefined();
        });

        test('should reject transaction without fromAccount', async () => {
            const data = validTransaction();
            delete data.fromAccount;

            const transaction = new transactionModel(data);

            await expect(transaction.validate()).rejects.toThrow();
        });

        test('should reject transaction without toAccount', async () => {
            const data = validTransaction();
            delete data.toAccount;

            const transaction = new transactionModel(data);

            await expect(transaction.validate()).rejects.toThrow();
        });

        test('should reject transaction without initiatedBy', async () => {
            const data = validTransaction();
            delete data.initiatedBy;

            const transaction = new transactionModel(data);

            await expect(transaction.validate()).rejects.toThrow();
        });

        test('should reject invalid transaction status', async () => {
            const transaction = new transactionModel({
                ...validTransaction(),
                status: 'INVALID'
            });

            await expect(transaction.validate()).rejects.toThrow();
        });

        test.each(['PENDING', 'COMPLETED', 'FAILED', 'REVERSED'])(
            'should accept transaction status %s',
            async (status) => {
                const transaction = new transactionModel({
                    ...validTransaction(),
                    status
                });

                await expect(transaction.validate()).resolves.toBeUndefined();
            }
        );

        test('should reject transaction without status', async () => {
            const transaction = new transactionModel({
                ...validTransaction(),
                status: null
            });

            await expect(transaction.validate()).rejects.toThrow();
        });

        test('should reject transaction without amount', async () => {
            const data = validTransaction();
            delete data.amount;

            const transaction = new transactionModel(data);

            await expect(transaction.validate()).rejects.toThrow();
        });
    });

    describe('Amount Validation', () => {
        test.each([0, -100, -0.50])(
            'should reject invalid amount %s',
            async (amount) => {
                const transaction = new transactionModel({
                    ...validTransaction(),
                    amount
                });

                await expect(transaction.validate()).rejects.toThrow();
            }
        );

        test.each([NaN, Infinity, -Infinity])(
            'should reject non-finite amount %s',
            async (amount) => {
                const transaction = new transactionModel({
                    ...validTransaction(),
                    amount
                });

                await expect(transaction.validate()).rejects.toThrow();
            }
        );

        test('should reject amount with more than two decimal places', async () => {
            const transaction = new transactionModel({
                ...validTransaction(),
                amount: 100.123
            });

            await expect(transaction.validate()).rejects.toThrow();
        });

        test('should accept amount with one decimal place', async () => {
            const transaction = new transactionModel({
                ...validTransaction(),
                amount: 100.5
            });

            await expect(transaction.validate()).resolves.toBeUndefined();
        });

        test('should accept amount with two decimal places', async () => {
            const transaction = new transactionModel({
                ...validTransaction(),
                amount: 100.25
            });

            await expect(transaction.validate()).resolves.toBeUndefined();
        });
    });

    describe('Idempotency Key Validation', () => {
        test('should reject transaction without idempotency key', async () => {
            const data = validTransaction();
            delete data.idempotencyKey;

            const transaction = new transactionModel(data);

            await expect(transaction.validate()).rejects.toThrow();
        });

        test('should trim idempotency key whitespace', () => {
            const transaction = new transactionModel({
                ...validTransaction(),
                idempotencyKey: '  transfer-123  '
            });

            expect(transaction.idempotencyKey).toBe('transfer-123');
        });

        test('should reject empty idempotency key', async () => {
            const transaction = new transactionModel({
                ...validTransaction(),
                idempotencyKey: '   '
            });

            await expect(transaction.validate()).rejects.toThrow();
        });

        test('should reject idempotency key longer than 128 characters', async () => {
            const transaction = new transactionModel({
                ...validTransaction(),
                idempotencyKey: 'a'.repeat(129)
            });

            await expect(transaction.validate()).rejects.toThrow();
        });

        test('should accept idempotency key with exactly 128 characters', async () => {
            const transaction = new transactionModel({
                ...validTransaction(),
                idempotencyKey: 'a'.repeat(128)
            });

            await expect(transaction.validate()).resolves.toBeUndefined();
        });
    });

    describe('Schema Indexes', () => {
        test('should define unique compound index for initiatedBy and idempotencyKey', () => {
            const indexes = transactionModel.schema.indexes();

            expect(indexes).toContainEqual([
                { initiatedBy: 1, idempotencyKey: 1 },
                { unique: true }
            ]);
        });

        test('should define index on fromAccount', () => {
            expect(transactionModel.schema.path('fromAccount').options.index).toBe(true);
        });

        test('should define index on toAccount', () => {
            expect(transactionModel.schema.path('toAccount').options.index).toBe(true);
        });

        test('should define index on initiatedBy', () => {
            expect(transactionModel.schema.path('initiatedBy').options.index).toBe(true);
        });
    });
});
