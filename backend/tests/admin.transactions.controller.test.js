
const mongoose = require('mongoose');

jest.mock('../src/models/transaction.model', () => ({
    aggregate: jest.fn()
}));

const Transaction = require('../src/models/transaction.model');

const {
    getAdminTransactionsController,
    getAdminTransactionDetailsController
} = require('../src/controllers/admin-transaction.controller');

const createResponse = () => {
    const res = {
        status: jest.fn(),
        json: jest.fn()
    };

    res.status.mockReturnValue(res);
    res.json.mockReturnValue(res);

    return res;
};

describe('Admin Transactions Controller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/admin/transactions', () => {
        it('should return paginated transactions', async () => {
            Transaction.aggregate.mockResolvedValue([
                {
                    metadata: [{ total: 1 }],
                    transactions: [
                        {
                            _id: new mongoose.Types.ObjectId(),
                            amount: 500,
                            status: 'COMPLETED'
                        }
                    ]
                }
            ]);

            const req = {
                query: {}
            };

            const res = createResponse();

            await getAdminTransactionsController(req, res);

            expect(Transaction.aggregate).toHaveBeenCalledTimes(1);
            expect(res.status).toHaveBeenCalledWith(200);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Transactions fetched successfully.',
                    transactions: expect.any(Array),
                    pagination: {
                        page: 1,
                        limit: 10,
                        total: 1,
                        totalPages: 1,
                        hasNextPage: false,
                        hasPreviousPage: false
                    }
                })
            );
        });

        it('should apply a valid status filter', async () => {
            Transaction.aggregate.mockResolvedValue([
                {
                    metadata: [],
                    transactions: []
                }
            ]);

            const req = {
                query: {
                    status: 'COMPLETED'
                }
            };

            const res = createResponse();

            await getAdminTransactionsController(req, res);

            const pipeline = Transaction.aggregate.mock.calls[0][0];

            expect(pipeline[0]).toEqual({
                $match: {
                    status: 'COMPLETED'
                }
            });

            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should reject an invalid status filter', async () => {
            const req = {
                query: {
                    status: 'UNKNOWN'
                }
            };

            const res = createResponse();

            await getAdminTransactionsController(req, res);

            expect(Transaction.aggregate).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Invalid transaction status filter.'
            });
        });

        it('should reject invalid pagination', async () => {
            const req = {
                query: {
                    page: '0',
                    limit: '10'
                }
            };

            const res = createResponse();

            await getAdminTransactionsController(req, res);

            expect(Transaction.aggregate).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should reject a limit above 100', async () => {
            const req = {
                query: {
                    limit: '101'
                }
            };

            const res = createResponse();

            await getAdminTransactionsController(req, res);

            expect(Transaction.aggregate).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should apply a date range filter', async () => {
            Transaction.aggregate.mockResolvedValue([
                {
                    metadata: [],
                    transactions: []
                }
            ]);

            const req = {
                query: {
                    startDate: '2026-01-01',
                    endDate: '2026-01-31'
                }
            };

            const res = createResponse();

            await getAdminTransactionsController(req, res);

            const pipeline = Transaction.aggregate.mock.calls[0][0];

            expect(pipeline[0].$match.createdAt.$gte).toEqual(
                new Date('2026-01-01')
            );

            expect(pipeline[0].$match.createdAt.$lte).toEqual(
                new Date('2026-01-31T23:59:59.999Z')
            );

            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should reject an invalid date', async () => {
            const req = {
                query: {
                    startDate: 'not-a-date'
                }
            };

            const res = createResponse();

            await getAdminTransactionsController(req, res);

            expect(Transaction.aggregate).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should reject a start date later than the end date', async () => {
            const req = {
                query: {
                    startDate: '2026-02-01',
                    endDate: '2026-01-01'
                }
            };

            const res = createResponse();

            await getAdminTransactionsController(req, res);

            expect(Transaction.aggregate).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);

            expect(res.json).toHaveBeenCalledWith({
                message: 'Start date cannot be later than end date.'
            });
        });

        it('should apply search across transaction participants and accounts', async () => {
            Transaction.aggregate.mockResolvedValue([
                {
                    metadata: [],
                    transactions: []
                }
            ]);

            const req = {
                query: {
                    search: 'ravi'
                }
            };

            const res = createResponse();

            await getAdminTransactionsController(req, res);

            const pipeline = Transaction.aggregate.mock.calls[0][0];

            const searchStage = pipeline.find(
                (stage) => stage.$match?.$or
            );

            expect(searchStage).toBeDefined();

            expect(searchStage.$match.$or).toEqual(
                expect.arrayContaining([
                    { 'senderAccount.owner.name': /ravi/i },
                    { 'receiverAccount.owner.email': /ravi/i },
                    { 'initiator.name': /ravi/i }
                ])
            );

            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should reject an empty search value', async () => {
            const req = {
                query: {
                    search: '   '
                }
            };

            const res = createResponse();

            await getAdminTransactionsController(req, res);

            expect(Transaction.aggregate).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should reject search values longer than 100 characters', async () => {
            const req = {
                query: {
                    search: 'a'.repeat(101)
                }
            };

            const res = createResponse();

            await getAdminTransactionsController(req, res);

            expect(Transaction.aggregate).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 500 when the database query fails', async () => {
            Transaction.aggregate.mockRejectedValue(
                new Error('Database failure')
            );

            const req = {
                query: {}
            };

            const res = createResponse();

            await getAdminTransactionsController(req, res);

            expect(res.status).toHaveBeenCalledWith(500);

            expect(res.json).toHaveBeenCalledWith({
                message: 'Unable to fetch transactions.'
            });
        });
    });

    describe('GET /api/admin/transactions/:transactionId', () => {
        it('should return transaction details', async () => {
            const transactionId = new mongoose.Types.ObjectId();

            const transaction = {
                _id: transactionId,
                amount: 750,
                status: 'COMPLETED',
                sender: {
                    accountName: 'Primary Account'
                },
                receiver: {
                    accountName: 'Savings Account'
                }
            };

            Transaction.aggregate.mockResolvedValue([
                transaction
            ]);

            const req = {
                params: {
                    transactionId: transactionId.toString()
                }
            };

            const res = createResponse();

            await getAdminTransactionDetailsController(req, res);

            expect(Transaction.aggregate).toHaveBeenCalledTimes(1);
            expect(res.status).toHaveBeenCalledWith(200);

            expect(res.json).toHaveBeenCalledWith({
                message: 'Transaction details fetched successfully.',
                transaction
            });
        });

        it('should reject an invalid transaction ID', async () => {
            const req = {
                params: {
                    transactionId: 'invalid-id'
                }
            };

            const res = createResponse();

            await getAdminTransactionDetailsController(req, res);

            expect(Transaction.aggregate).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);

            expect(res.json).toHaveBeenCalledWith({
                message: 'Invalid transaction ID.'
            });
        });

        it('should return 404 when the transaction does not exist', async () => {
            const transactionId = new mongoose.Types.ObjectId();

            Transaction.aggregate.mockResolvedValue([]);

            const req = {
                params: {
                    transactionId: transactionId.toString()
                }
            };

            const res = createResponse();

            await getAdminTransactionDetailsController(req, res);

            expect(res.status).toHaveBeenCalledWith(404);

            expect(res.json).toHaveBeenCalledWith({
                message: 'Transaction not found.'
            });
        });

        it('should return 500 when the details query fails', async () => {
            const transactionId = new mongoose.Types.ObjectId();

            Transaction.aggregate.mockRejectedValue(
                new Error('Database failure')
            );

            const req = {
                params: {
                    transactionId: transactionId.toString()
                }
            };

            const res = createResponse();

            await getAdminTransactionDetailsController(req, res);

            expect(res.status).toHaveBeenCalledWith(500);

            expect(res.json).toHaveBeenCalledWith({
                message: 'Unable to fetch transaction details.'
            });
        });
    });
});
