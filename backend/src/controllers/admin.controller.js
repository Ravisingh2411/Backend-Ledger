
const mongoose = require('mongoose');

const User = require('../models/user.model');
const Account = require('../models/account.model');
const Transaction = require('../models/transaction.model');
const Ledger = require('../models/ledger.model');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const escapeRegex = value => {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const getPaginationParams = query => {
    const page = query.page === undefined
        ? DEFAULT_PAGE
        : Number(query.page);

    const limit = query.limit === undefined
        ? DEFAULT_LIMIT
        : Number(query.limit);

    if (
        !Number.isSafeInteger(page) ||
        page < 1 ||
        !Number.isSafeInteger(limit) ||
        limit < 1 ||
        limit > MAX_LIMIT
    ) {
        return null;
    }

    return { page, limit };
};

const createControllerError = (message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const getAdminDashboardController = async (req, res) => {
    try {
        const customerInitiatedCondition = {
            $and: [
                { $eq: ['$status', 'COMPLETED'] },
                { $eq: ['$initiator.role', 'user'] },
                { $ne: ['$initiator.systemUser', true] }
            ]
        };

        const internalSystemCondition = {
            $and: [
                { $eq: ['$status', 'COMPLETED'] },
                { $eq: ['$initiator.systemUser', true] }
            ]
        };

        // Only transactions whose initiator reference cannot be resolved.
        const unattributedCondition = {
            $and: [
                { $eq: ['$status', 'COMPLETED'] },
                {
                    $eq: [
                        { $ifNull: ['$initiator._id', null] },
                        null
                    ]
                }
            ]
        };

        const [
            totalCustomers,
            totalAdmins,
            accountResults,
            transactionResults
        ] = await Promise.all([
            User.countDocuments({
                role: 'user',
                systemUser: { $ne: true }
            }),

            User.countDocuments({
                role: 'admin',
                systemUser: { $ne: true }
            }),

            Account.aggregate([
                {
                    $lookup: {
                        from: 'users',
                        localField: 'user',
                        foreignField: '_id',
                        as: 'owner'
                    }
                },
                { $unwind: '$owner' },
                {
                    $match: {
                        'owner.role': 'user',
                        'owner.systemUser': { $ne: true }
                    }
                },
                { $count: 'total' }
            ]),

            Transaction.aggregate([
                {
                    $lookup: {
                        from: 'users',
                        localField: 'initiatedBy',
                        foreignField: '_id',
                        as: 'initiator'
                    }
                },
                {
                    $unwind: {
                        path: '$initiator',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $group: {
                        _id: null,

                        total: { $sum: 1 },

                        pending: {
                            $sum: {
                                $cond: [
                                    { $eq: ['$status', 'PENDING'] },
                                    1,
                                    0
                                ]
                            }
                        },

                        completed: {
                            $sum: {
                                $cond: [
                                    { $eq: ['$status', 'COMPLETED'] },
                                    1,
                                    0
                                ]
                            }
                        },

                        failed: {
                            $sum: {
                                $cond: [
                                    { $eq: ['$status', 'FAILED'] },
                                    1,
                                    0
                                ]
                            }
                        },

                        reversed: {
                            $sum: {
                                $cond: [
                                    { $eq: ['$status', 'REVERSED'] },
                                    1,
                                    0
                                ]
                            }
                        },

                        completedVolume: {
                            $sum: {
                                $cond: [
                                    { $eq: ['$status', 'COMPLETED'] },
                                    '$amount',
                                    0
                                ]
                            }
                        },

                        customerInitiatedCount: {
                            $sum: {
                                $cond: [
                                    customerInitiatedCondition,
                                    1,
                                    0
                                ]
                            }
                        },

                        customerInitiatedVolume: {
                            $sum: {
                                $cond: [
                                    customerInitiatedCondition,
                                    '$amount',
                                    0
                                ]
                            }
                        },

                        internalSystemCount: {
                            $sum: {
                                $cond: [
                                    internalSystemCondition,
                                    1,
                                    0
                                ]
                            }
                        },

                        internalSystemVolume: {
                            $sum: {
                                $cond: [
                                    internalSystemCondition,
                                    '$amount',
                                    0
                                ]
                            }
                        },

                        unattributedCount: {
                            $sum: {
                                $cond: [
                                    unattributedCondition,
                                    1,
                                    0
                                ]
                            }
                        },

                        unattributedVolume: {
                            $sum: {
                                $cond: [
                                    unattributedCondition,
                                    '$amount',
                                    0
                                ]
                            }
                        }
                    }
                }
            ])
        ]);

        const accountCount = accountResults[0]?.total || 0;
        const transactionStats = transactionResults[0] || {};

        return res.status(200).json({
            message: 'Dashboard statistics fetched successfully.',
            dashboard: {
                customers: {
                    total: totalCustomers,
                    admins: totalAdmins
                },
                accounts: {
                    total: accountCount
                },
                transactions: {
                    total: transactionStats.total || 0,
                    pending: transactionStats.pending || 0,
                    completed: transactionStats.completed || 0,
                    failed: transactionStats.failed || 0,
                    reversed: transactionStats.reversed || 0,

                    // All completed transactions across the platform.
                    completedVolume: transactionStats.completedVolume || 0,

                    // Completed transactions initiated by normal customers.
                    customerInitiated: {
                        count: transactionStats.customerInitiatedCount || 0,
                        volume: transactionStats.customerInitiatedVolume || 0
                    },

                    // Completed transactions initiated by internal system users.
                    internalSystem: {
                        count: transactionStats.internalSystemCount || 0,
                        volume: transactionStats.internalSystemVolume || 0
                    },

                    // Completed transactions whose initiator cannot be reliably resolved.
                    unattributed: {
                        count: transactionStats.unattributedCount || 0,
                        volume: transactionStats.unattributedVolume || 0
                    }
                }
            }
        });
    } catch (error) {
        console.error('Admin dashboard error:', error);

        return res.status(500).json({
            message: 'Unable to fetch admin dashboard statistics.'
        });
    }
};

const getAdminUsersController = async (req, res) => {
    try {
        const pagination = getPaginationParams(req.query);

        if (!pagination) {
            return res.status(400).json({
                message: 'Page must be a positive integer and limit must be between 1 and 100.'
            });
        }

        const { page, limit } = pagination;
        const search = typeof req.query.search === 'string'
            ? req.query.search.trim()
            : '';

        if (search.length > 100) {
            return res.status(400).json({
                message: 'Search query cannot exceed 100 characters.'
            });
        }

        const filter = {
            role: 'user',
            systemUser: { $ne: true }
        };

        if (search) {
            const searchRegex = new RegExp(escapeRegex(search), 'i');

            filter.$or = [
                { name: searchRegex },
                { email: searchRegex }
            ];
        }

        const skip = (page - 1) * limit;

        const [users, total] = await Promise.all([
            User.find(filter)
                .select('name email role createdAt updatedAt')
                .sort({ createdAt: -1, _id: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),

            User.countDocuments(filter)
        ]);

        let accountCounts = [];

        if (users.length > 0) {
            const userIds = users.map(user => user._id);

            accountCounts = await Account.aggregate([
                {
                    $match: {
                        user: { $in: userIds }
                    }
                },
                {
                    $group: {
                        _id: '$user',
                        total: { $sum: 1 }
                    }
                }
            ]);
        }

        const accountCountMap = new Map(
            accountCounts.map(item => [
                item._id.toString(),
                item.total
            ])
        );

        const customerList = users.map(user => ({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            accountCount: accountCountMap.get(user._id.toString()) || 0
        }));

        const totalPages = Math.ceil(total / limit);

        return res.status(200).json({
            message: 'Customers fetched successfully.',
            users: customerList,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1
            }
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Unable to fetch customers.'
        });
    }
};

const getAdminUserDetailsController = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                message: 'Invalid customer ID.'
            });
        }

        const user = await User.findOne({
            _id: userId,
            role: 'user',
            systemUser: { $ne: true }
        })
            .select('name email role createdAt updatedAt')
            .lean();

        if (!user) {
            return res.status(404).json({
                message: 'Customer not found.'
            });
        }

        const accounts = await Account.find({
            user: user._id
        }).sort({ createdAt: 1, _id: 1 });

        const accountDetails = await Promise.all(
            accounts.map(async account => {
                const balance = await account.getBalance();

                return {
                    _id: account._id,
                    name: account.name,
                    status: account.status,
                    currency: account.currency,
                    balance,
                    createdAt: account.createdAt,
                    updatedAt: account.updatedAt
                };
            })
        );

        return res.status(200).json({
            message: 'Customer details fetched successfully.',
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            },
            accounts: accountDetails
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Unable to fetch customer details.'
        });
    }
};

const getAdminAccountsController = async (req, res) => {
    try {
        const pagination = getPaginationParams(req.query);

        if (!pagination) {
            return res.status(400).json({
                message: 'Page must be a positive integer and limit must be between 1 and 100.'
            });
        }

        const { page, limit } = pagination;
        const search = typeof req.query.search === 'string'
            ? req.query.search.trim()
            : '';
        const status = req.query.status;

        if (search.length > 100) {
            return res.status(400).json({
                message: 'Search query cannot exceed 100 characters.'
            });
        }

        if (
            status !== undefined &&
            !['ACTIVE', 'FROZEN', 'CLOSED'].includes(status)
        ) {
            return res.status(400).json({
                message: 'Invalid account status filter.'
            });
        }

        const match = {
            'owner.role': 'user',
            'owner.systemUser': { $ne: true }
        };

        if (status) {
            match.status = status;
        }

        if (search) {
            const searchRegex = new RegExp(escapeRegex(search), 'i');

            match.$or = [
                { name: searchRegex },
                { 'owner.name': searchRegex },
                { 'owner.email': searchRegex },
                {
                    $expr: {
                        $regexMatch: {
                            input: { $toString: '$_id' },
                            regex: escapeRegex(search),
                            options: 'i'
                        }
                    }
                }
            ];
        }

        const [result] = await Account.aggregate([
            {
                $lookup: {
                    from: 'users',
                    localField: 'user',
                    foreignField: '_id',
                    as: 'owner'
                }
            },
            { $unwind: '$owner' },
            { $match: match },
            {
                $sort: {
                    createdAt: -1,
                    _id: -1
                }
            },
            {
                $facet: {
                    metadata: [
                        { $count: 'total' }
                    ],
                    accounts: [
                        { $skip: (page - 1) * limit },
                        { $limit: limit },
                        {
                            $project: {
                                name: 1,
                                status: 1,
                                currency: 1,
                                createdAt: 1,
                                updatedAt: 1,
                                owner: {
                                    _id: '$owner._id',
                                    name: '$owner.name',
                                    email: '$owner.email'
                                }
                            }
                        }
                    ]
                }
            }
        ]);

        const accounts = result?.accounts || [];
        const total = result?.metadata[0]?.total || 0;

        let balances = [];

        if (accounts.length > 0) {
            balances = await Ledger.aggregate([
                {
                    $match: {
                        account: {
                            $in: accounts.map(account => account._id)
                        }
                    }
                },
                {
                    $group: {
                        _id: '$account',
                        credits: {
                            $sum: {
                                $cond: [
                                    { $eq: ['$type', 'CREDIT'] },
                                    '$amount',
                                    0
                                ]
                            }
                        },
                        debits: {
                            $sum: {
                                $cond: [
                                    { $eq: ['$type', 'DEBIT'] },
                                    '$amount',
                                    0
                                ]
                            }
                        }
                    }
                }
            ]);
        }

        const balanceMap = new Map(
            balances.map(item => [
                item._id.toString(),
                item.credits - item.debits
            ])
        );

        const accountList = accounts.map(account => ({
            _id: account._id,
            name: account.name,
            status: account.status,
            currency: account.currency,
            balance: balanceMap.get(account._id.toString()) || 0,
            owner: account.owner,
            createdAt: account.createdAt,
            updatedAt: account.updatedAt
        }));

        const totalPages = Math.ceil(total / limit);

        return res.status(200).json({
            message: 'Accounts fetched successfully.',
            accounts: accountList,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1
            }
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Unable to fetch accounts.'
        });
    }
};

const getAdminAccountDetailsController = async (req, res) => {
    try {
        const { accountId } = req.params;

        if (!mongoose.isValidObjectId(accountId)) {
            return res.status(400).json({
                message: 'Invalid account ID.'
            });
        }

        const account = await Account.findById(accountId);

        if (!account) {
            return res.status(404).json({
                message: 'Account not found.'
            });
        }

        const owner = await User.findOne({
            _id: account.user,
            role: 'user',
            systemUser: { $ne: true }
        })
            .select('name email')
            .lean();

        if (!owner) {
            return res.status(404).json({
                message: 'Account not found.'
            });
        }

        const balance = await account.getBalance();

        return res.status(200).json({
            message: 'Account details fetched successfully.',
            account: {
                _id: account._id,
                name: account.name,
                status: account.status,
                currency: account.currency,
                balance,
                owner: {
                    _id: owner._id,
                    name: owner.name,
                    email: owner.email
                },
                createdAt: account.createdAt,
                updatedAt: account.updatedAt
            }
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Unable to fetch account details.'
        });
    }
};

const updateAdminAccountStatusController = async (req, res) => {
    let session;

    try {
        const { accountId } = req.params;
        const { status: targetStatus } = req.body;

        if (!mongoose.isValidObjectId(accountId)) {
            return res.status(400).json({
                message: 'Invalid account ID.'
            });
        }

        if (!['ACTIVE', 'FROZEN', 'CLOSED'].includes(targetStatus)) {
            return res.status(400).json({
                message: 'Status must be ACTIVE, FROZEN or CLOSED.'
            });
        }

        session = await mongoose.startSession();

        let updatedAccount;

        await session.withTransaction(async () => {
            const account = await Account.findById(accountId)
                .select('+transactionVersion')
                .session(session);

            if (!account) {
                throw createControllerError(
                    'Account not found.',
                    404
                );
            }

            const owner = await User.findOne({
                _id: account.user,
                role: 'user',
                systemUser: { $ne: true }
            }).session(session);

            if (!owner) {
                throw createControllerError(
                    'Account not found.',
                    404
                );
            }

            if (account.status === targetStatus) {
                throw createControllerError(
                    `Account is already ${targetStatus}.`,
                    409
                );
            }

            const allowedTransitions = {
                ACTIVE: ['FROZEN', 'CLOSED'],
                FROZEN: ['ACTIVE', 'CLOSED'],
                CLOSED: []
            };

            if (!allowedTransitions[account.status]?.includes(targetStatus)) {
                throw createControllerError(
                    `Cannot change account status from ${account.status} to ${targetStatus}.`,
                    409
                );
            }

            if (targetStatus === 'CLOSED') {
                const balance = await account.getBalance({ session });

                if (balance !== 0) {
                    throw createControllerError(
                        'Account can only be closed when its balance is zero.',
                        409
                    );
                }
            }

            updatedAccount = await Account.findOneAndUpdate(
                {
                    _id: account._id,
                    status: account.status,
                    transactionVersion: account.transactionVersion
                },
                {
                    $set: {
                        status: targetStatus
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

            if (!updatedAccount) {
                throw createControllerError(
                    'Account changed during this operation. Please retry.',
                    409
                );
            }
        });

        return res.status(200).json({
            message: `Account status changed to ${targetStatus}.`,
            account: {
                _id: updatedAccount._id,
                name: updatedAccount.name,
                status: updatedAccount.status,
                currency: updatedAccount.currency,
                updatedAt: updatedAccount.updatedAt
            }
        });
    } catch (error) {
        const statusCode = error.statusCode || 500;

        return res.status(statusCode).json({
            message: error.statusCode
                ? error.message
                : 'Unable to update account status.'
        });
    } finally {
        if (session) {
            await session.endSession();
        }
    }
};

module.exports = {
    getAdminDashboardController,
    getAdminUsersController,
    getAdminUserDetailsController,
    getAdminAccountsController,
    getAdminAccountDetailsController,
    updateAdminAccountStatusController
};
