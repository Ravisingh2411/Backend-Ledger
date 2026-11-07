
const express = require('express');
const request = require('supertest');

jest.mock('../src/models/user.model', () => ({
    countDocuments: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn()
}));

jest.mock('../src/models/account.model', () => ({
    aggregate: jest.fn(),
    find: jest.fn()
}));

jest.mock('../src/models/transaction.model', () => ({
    aggregate: jest.fn()
}));

const User = require('../src/models/user.model');
const Account = require('../src/models/account.model');
const Transaction = require('../src/models/transaction.model');

const {
    getAdminDashboardController,
    getAdminUsersController,
    getAdminUserDetailsController
} = require('../src/controllers/admin.controller');

const app = express();

app.use(express.json());

app.get('/api/admin/dashboard', getAdminDashboardController);
app.get('/api/admin/users', getAdminUsersController);
app.get('/api/admin/users/:userId', getAdminUserDetailsController);

const createLeanQuery = result => ({
    select: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result)
});

describe('Admin Dashboard Controller', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        User.countDocuments
            .mockResolvedValueOnce(25)
            .mockResolvedValueOnce(2);

        Account.aggregate.mockResolvedValue([
            { total: 40 }
        ]);

        Transaction.aggregate.mockResolvedValue([
            {
                total: 100,
                pending: 5,
                completed: 85,
                failed: 7,
                reversed: 3,
                completedVolume: 125000
            }
        ]);
    });

    test('should return dashboard statistics', async () => {
        const response = await request(app)
            .get('/api/admin/dashboard');

        expect(response.status).toBe(200);

        expect(response.body).toEqual({
            message: 'Dashboard statistics fetched successfully.',
            dashboard: {
                customers: {
                    total: 25,
                    admins: 2
                },
                accounts: {
                    total: 40
                },
                transactions: {
                    total: 100,
                    pending: 5,
                    completed: 85,
                    failed: 7,
                    reversed: 3,
                    completedVolume: 125000,
                    customerInitiated: {
                        count: 0,
                        volume: 0
                    },
                    internalSystem: {
                        count: 0,
                        volume: 0
                    },
                    unattributed: {
                        count: 0,
                        volume: 0
                    }
                }
            }
        });

        expect(User.countDocuments).toHaveBeenNthCalledWith(1, {
            role: 'user',
            systemUser: { $ne: true }
        });

        expect(User.countDocuments).toHaveBeenNthCalledWith(2, {
            role: 'admin',
            systemUser: { $ne: true }
        });

        expect(Account.aggregate).toHaveBeenCalled();
        expect(Transaction.aggregate).toHaveBeenCalled();
    });

    test('should exclude internal system users from customer account statistics', async () => {
        await request(app)
            .get('/api/admin/dashboard');

        const pipeline = Account.aggregate.mock.calls[0][0];

        expect(pipeline).toEqual(
            expect.arrayContaining([
                {
                    $match: {
                        'owner.role': 'user',
                        'owner.systemUser': { $ne: true }
                    }
                }
            ])
        );
    });

    test('should return zero values when no records exist', async () => {
        User.countDocuments
            .mockReset()
            .mockResolvedValueOnce(0)
            .mockResolvedValueOnce(0);

        Account.aggregate.mockResolvedValue([]);
        Transaction.aggregate.mockResolvedValue([]);

        const response = await request(app)
            .get('/api/admin/dashboard');

        expect(response.status).toBe(200);

        expect(response.body.dashboard).toEqual({
            customers: {
                total: 0,
                admins: 0
            },
            accounts: {
                total: 0
            },
            transactions: {
                total: 0,
                pending: 0,
                completed: 0,
                failed: 0,
                reversed: 0,
                completedVolume: 0,
                customerInitiated: {
                    count: 0,
                    volume: 0
                },
                internalSystem: {
                    count: 0,
                    volume: 0
                },
                unattributed: {
                    count: 0,
                    volume: 0
                }
            }
        });
    });

    test('should return 500 when a dashboard database query fails', async () => {
        User.countDocuments
            .mockReset()
            .mockRejectedValueOnce(
                new Error('Database connection failed')
            );

        const response = await request(app)
            .get('/api/admin/dashboard');

        expect(response.status).toBe(500);
        expect(response.body.message).toBe(
            'Unable to fetch admin dashboard statistics.'
        );
    });
});

describe('Admin Users Controller', () => {
    const userId = '507f1f77bcf86cd799439011';
    const secondUserId = '507f1f77bcf86cd799439012';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should return paginated customer listing with account counts', async () => {
        const users = [
            {
                _id: userId,
                name: 'Ravi Singh',
                email: 'ravi@example.com',
                role: 'user',
                password: 'must-not-be-exposed',
                createdAt: new Date('2026-01-01'),
                updatedAt: new Date('2026-01-02')
            },
            {
                _id: secondUserId,
                name: 'Aman Kumar',
                email: 'aman@example.com',
                role: 'user',
                password: 'must-not-be-exposed',
                createdAt: new Date('2026-01-03'),
                updatedAt: new Date('2026-01-04')
            }
        ];

        const query = createLeanQuery(users);

        User.find.mockReturnValue(query);
        User.countDocuments.mockResolvedValue(2);

        Account.aggregate.mockResolvedValue([
            {
                _id: userId,
                total: 2
            },
            {
                _id: secondUserId,
                total: 1
            }
        ]);

        const response = await request(app)
            .get('/api/admin/users');

        expect(response.status).toBe(200);

        expect(response.body.message).toBe(
            'Customers fetched successfully.'
        );

        expect(response.body.users).toHaveLength(2);

        expect(response.body.users[0]).toEqual({
            _id: userId,
            name: 'Ravi Singh',
            email: 'ravi@example.com',
            role: 'user',
            createdAt: users[0].createdAt.toISOString(),
            updatedAt: users[0].updatedAt.toISOString(),
            accountCount: 2
        });

        expect(response.body.users[1].accountCount).toBe(1);

        expect(response.body.users[0]).not.toHaveProperty('password');

        expect(response.body.pagination).toEqual({
            page: 1,
            limit: 10,
            total: 2,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false
        });

        expect(User.find).toHaveBeenCalledWith({
            role: 'user',
            systemUser: { $ne: true }
        });

        expect(User.countDocuments).toHaveBeenCalledWith({
            role: 'user',
            systemUser: { $ne: true }
        });

        expect(query.skip).toHaveBeenCalledWith(0);
        expect(query.limit).toHaveBeenCalledWith(10);
    });

    test('should apply search to customer name and email', async () => {
        const query = createLeanQuery([]);

        User.find.mockReturnValue(query);
        User.countDocuments.mockResolvedValue(0);

        const response = await request(app)
            .get('/api/admin/users?search=ravi');

        expect(response.status).toBe(200);

        const filter = User.find.mock.calls[0][0];

        expect(filter.role).toBe('user');
        expect(filter.systemUser).toEqual({ $ne: true });
        expect(filter.$or).toHaveLength(2);

        expect(filter.$or[0].name).toBeInstanceOf(RegExp);
        expect(filter.$or[1].email).toBeInstanceOf(RegExp);

        expect(filter.$or[0].name.test('Ravi Singh')).toBe(true);
        expect(filter.$or[1].email.test('ravi@example.com')).toBe(true);
    });

    test('should safely escape special regex characters in search', async () => {
        const query = createLeanQuery([]);

        User.find.mockReturnValue(query);
        User.countDocuments.mockResolvedValue(0);

        const response = await request(app)
            .get('/api/admin/users?search=%5Badmin%5D');

        expect(response.status).toBe(200);

        const filter = User.find.mock.calls[0][0];

        expect(filter.$or[0].name.source).toBe('\\[admin\\]');
        expect(filter.$or[1].email.source).toBe('\\[admin\\]');
    });

    test('should support custom pagination parameters', async () => {
        const query = createLeanQuery([]);

        User.find.mockReturnValue(query);
        User.countDocuments.mockResolvedValue(25);

        const response = await request(app)
            .get('/api/admin/users?page=2&limit=5');

        expect(response.status).toBe(200);

        expect(query.skip).toHaveBeenCalledWith(5);
        expect(query.limit).toHaveBeenCalledWith(5);

        expect(response.body.pagination).toEqual({
            page: 2,
            limit: 5,
            total: 25,
            totalPages: 5,
            hasNextPage: true,
            hasPreviousPage: true
        });
    });

    test('should reject invalid pagination parameters', async () => {
        const response = await request(app)
            .get('/api/admin/users?page=0&limit=101');

        expect(response.status).toBe(400);
        expect(User.find).not.toHaveBeenCalled();
        expect(User.countDocuments).not.toHaveBeenCalled();
    });

    test('should reject search queries longer than 100 characters', async () => {
        const search = 'a'.repeat(101);

        const response = await request(app)
            .get(`/api/admin/users?search=${search}`);

        expect(response.status).toBe(400);
        expect(User.find).not.toHaveBeenCalled();
    });

    test('should return an empty customer listing when no customers exist', async () => {
        const query = createLeanQuery([]);

        User.find.mockReturnValue(query);
        User.countDocuments.mockResolvedValue(0);

        const response = await request(app)
            .get('/api/admin/users');

        expect(response.status).toBe(200);
        expect(response.body.users).toEqual([]);
        expect(response.body.pagination.total).toBe(0);
        expect(Account.aggregate).not.toHaveBeenCalled();
    });

    test('should return 500 when customer listing query fails', async () => {
        User.find.mockReturnValue({
            select: jest.fn().mockReturnThis(),
            sort: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            lean: jest.fn().mockRejectedValue(
                new Error('Database connection failed')
            )
        });

        User.countDocuments.mockResolvedValue(0);

        const response = await request(app)
            .get('/api/admin/users');

        expect(response.status).toBe(500);
        expect(response.body.message).toBe(
            'Unable to fetch customers.'
        );
    });
});

describe('Admin User Details Controller', () => {
    const userId = '507f1f77bcf86cd799439011';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should return customer details with ledger-derived account balances', async () => {
        const user = {
            _id: userId,
            name: 'Ravi Singh',
            email: 'ravi@example.com',
            role: 'user',
            password: 'must-not-be-exposed',
            createdAt: new Date('2026-01-01'),
            updatedAt: new Date('2026-01-02')
        };

        const account = {
            _id: '507f1f77bcf86cd799439013',
            name: 'Primary Account',
            status: 'ACTIVE',
            currency: 'INR',
            createdAt: new Date('2026-01-03'),
            updatedAt: new Date('2026-01-04'),
            getBalance: jest.fn().mockResolvedValue(15000)
        };

        const userQuery = createLeanQuery(user);

        User.findOne.mockReturnValue(userQuery);

        Account.find.mockReturnValue({
            sort: jest.fn().mockResolvedValue([account])
        });

        const response = await request(app)
            .get(`/api/admin/users/${userId}`);

        expect(response.status).toBe(200);

        expect(response.body.message).toBe(
            'Customer details fetched successfully.'
        );

        expect(response.body.user).toEqual({
            _id: userId,
            name: 'Ravi Singh',
            email: 'ravi@example.com',
            role: 'user',
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString()
        });

        expect(response.body.user).not.toHaveProperty('password');

        expect(response.body.accounts).toHaveLength(1);

        expect(response.body.accounts[0]).toEqual({
            _id: account._id,
            name: 'Primary Account',
            status: 'ACTIVE',
            currency: 'INR',
            balance: 15000,
            createdAt: account.createdAt.toISOString(),
            updatedAt: account.updatedAt.toISOString()
        });

        expect(account.getBalance).toHaveBeenCalledTimes(1);

        expect(User.findOne).toHaveBeenCalledWith({
            _id: userId,
            role: 'user',
            systemUser: { $ne: true }
        });

        expect(Account.find).toHaveBeenCalledWith({
            user: userId
        });
    });

    test('should reject an invalid customer ID', async () => {
        const response = await request(app)
            .get('/api/admin/users/invalid-id');

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Invalid customer ID.');

        expect(User.findOne).not.toHaveBeenCalled();
    });

    test('should return 404 when customer does not exist', async () => {
        const query = createLeanQuery(null);

        User.findOne.mockReturnValue(query);

        const response = await request(app)
            .get(`/api/admin/users/${userId}`);

        expect(response.status).toBe(404);
        expect(response.body.message).toBe('Customer not found.');

        expect(Account.find).not.toHaveBeenCalled();
    });

    test('should return 500 when customer details query fails', async () => {
        User.findOne.mockReturnValue({
            select: jest.fn().mockReturnThis(),
            lean: jest.fn().mockRejectedValue(
                new Error('Database connection failed')
            )
        });

        const response = await request(app)
            .get(`/api/admin/users/${userId}`);

        expect(response.status).toBe(500);
        expect(response.body.message).toBe(
            'Unable to fetch customer details.'
        );
    });

    test('should return 500 when ledger balance calculation fails', async () => {
        const userQuery = createLeanQuery({
            _id: userId,
            name: 'Ravi Singh',
            email: 'ravi@example.com',
            role: 'user'
        });

        User.findOne.mockReturnValue(userQuery);

        Account.find.mockReturnValue({
            sort: jest.fn().mockResolvedValue([
                {
                    _id: '507f1f77bcf86cd799439013',
                    name: 'Primary Account',
                    status: 'ACTIVE',
                    currency: 'INR',
                    getBalance: jest.fn().mockRejectedValue(
                        new Error('Ledger query failed')
                    )
                }
            ])
        });

        const response = await request(app)
            .get(`/api/admin/users/${userId}`);

        expect(response.status).toBe(500);
        expect(response.body.message).toBe(
            'Unable to fetch customer details.'
        );
    });
});
