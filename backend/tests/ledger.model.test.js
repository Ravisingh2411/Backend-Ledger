
const mongoose = require('mongoose');
const ledgerModel = require('../src/models/ledger.model');

describe('Ledger Model Tests', () => {
    const validLedger = () => ({
        account: new mongoose.Types.ObjectId(),
        amount: 100.50,
        transaction: new mongoose.Types.ObjectId(),
        type: 'CREDIT'
    });

    describe('Schema Validation', () => {
        test('should create a valid CREDIT ledger entry', async () => {
            const ledger = new ledgerModel(validLedger());

            await expect(ledger.validate()).resolves.toBeUndefined();
        });

        test('should create a valid DEBIT ledger entry', async () => {
            const ledger = new ledgerModel({
                ...validLedger(),
                type: 'DEBIT'
            });

            await expect(ledger.validate()).resolves.toBeUndefined();
        });

        test('should reject ledger without account', async () => {
            const data = validLedger();
            delete data.account;

            const ledger = new ledgerModel(data);

            await expect(ledger.validate()).rejects.toThrow();
        });

        test('should reject ledger without amount', async () => {
            const data = validLedger();
            delete data.amount;

            const ledger = new ledgerModel(data);

            await expect(ledger.validate()).rejects.toThrow();
        });

        test('should reject ledger without transaction', async () => {
            const data = validLedger();
            delete data.transaction;

            const ledger = new ledgerModel(data);

            await expect(ledger.validate()).rejects.toThrow();
        });

        test('should reject ledger without type', async () => {
            const data = validLedger();
            delete data.type;

            const ledger = new ledgerModel(data);

            await expect(ledger.validate()).rejects.toThrow();
        });

        test('should reject invalid ledger type', async () => {
            const ledger = new ledgerModel({
                ...validLedger(),
                type: 'INVALID'
            });

            await expect(ledger.validate()).rejects.toThrow();
        });
    });

    describe('Schema Immutability', () => {
        test.each(['account', 'amount', 'transaction', 'type'])(
            'should make %s field immutable',
            (field) => {
                expect(
                    ledgerModel.schema.path(field).options.immutable
                ).toBe(true);
            }
        );
    });

    describe('Schema Indexes', () => {
        test('should define index on account', () => {
            expect(ledgerModel.schema.path('account').options.index).toBe(true);
        });

        test('should define index on transaction', () => {
            expect(ledgerModel.schema.path('transaction').options.index).toBe(true);
        });
    });

    describe('Ledger Modification Protection', () => {
        const operations = [
            {
                name: 'findOneAndUpdate',
                execute: () => ledgerModel.findOneAndUpdate(
                    {},
                    { $set: { amount: 200 } }
                )
            },
            {
                name: 'updateOne',
                execute: () => ledgerModel.updateOne(
                    {},
                    { $set: { amount: 200 } }
                )
            },
            {
                name: 'deleteOne',
                execute: () => ledgerModel.deleteOne({})
            },
            {
                name: 'deleteMany',
                execute: () => ledgerModel.deleteMany({})
            },
            {
                name: 'updateMany',
                execute: () => ledgerModel.updateMany(
                    {},
                    { $set: { amount: 200 } }
                )
            },
            {
                name: 'findOneAndDelete',
                execute: () => ledgerModel.findOneAndDelete({})
            },
            {
                name: 'findOneAndReplace',
                execute: () => ledgerModel.findOneAndReplace(
                    {},
                    validLedger()
                )
            }
        ];

        test.each(operations)(
            'should block $name operation',
            async ({ execute }) => {
                const query = execute();

                await expect(query.exec()).rejects.toThrow(
                    'Ledger entries are immutable and cannot be modified or deleted'
                );
            }
        );

        test('should register remove middleware', () => {
            const hooks = ledgerModel.schema.s.hooks._pres.get('remove') || [];

            expect(
                hooks.some(hook =>
                    hook.fn.name === 'preventLedgerModification'
                )
            ).toBe(true);
        });
    });
});
