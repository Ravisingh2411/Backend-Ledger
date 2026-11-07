
const mongoose = require('mongoose');
const Transaction = require('../models/transaction.model');

const ALLOWED_STATUSES = [
    'PENDING',
    'COMPLETED',
    'FAILED',
    'REVERSED'
];

const escapeRegex = (value) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const createAdminError = (message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const parsePagination = (query) => {
    const page = query.page === undefined ? 1 : Number(query.page);
    const limit = query.limit === undefined ? 10 : Number(query.limit);

    if (
        !Number.isSafeInteger(page) ||
        !Number.isSafeInteger(limit) ||
        page < 1 ||
        limit < 1 ||
        limit > 100
    ) {
        throw createAdminError(
            'Invalid pagination parameters.',
            400
        );
    }

    return { page, limit };
};

const parseDate = (value, fieldName, isEndDate = false) => {
    if (value === undefined) {
        return null;
    }

    if (
        typeof value !== 'string' ||
        value.trim() === ''
    ) {
        throw createAdminError(
            `Invalid ${fieldName}.`,
            400
        );
    }

    const normalizedValue = value.trim();

    // Date-only input: YYYY-MM-DD
    const dateOnlyMatch = normalizedValue.match(
        /^(\d{4})-(\d{2})-(\d{2})$/
    );

    if (dateOnlyMatch) {
        const date = new Date(
            `${normalizedValue}T00:00:00.000Z`
        );

        if (
            !Number.isFinite(date.getTime()) ||
            date.toISOString().slice(0, 10) !== normalizedValue
        ) {
            throw createAdminError(
                `Invalid ${fieldName}.`,
                400
            );
        }

        if (isEndDate) {
            date.setUTCHours(23, 59, 59, 999);
        }

        return date;
    }

    const timestamp = Date.parse(normalizedValue);

    if (!Number.isFinite(timestamp)) {
        throw createAdminError(
            `Invalid ${fieldName}.`,
            400
        );
    }

    return new Date(timestamp);
};

const buildTransactionLookups = () => [
    {
        $lookup: {
            from: 'accounts',
            let: { accountId: '$fromAccount' },
            pipeline: [
                {
                    $match: {
                        $expr: {
                            $eq: ['$_id', '$$accountId']
                        }
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'user',
                        foreignField: '_id',
                        as: 'owner'
                    }
                },
                {
                    $unwind: {
                        path: '$owner',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $project: {
                        name: 1,
                        accountNumber: 1,
                        status: 1,
                        currency: 1,
                        user: 1,
                        owner: {
                            _id: '$owner._id',
                            name: '$owner.name',
                            email: '$owner.email',
                            role: '$owner.role',
                            systemUser: '$owner.systemUser'
                        }
                    }
                }
            ],
            as: 'senderAccount'
        }
    },
    {
        $unwind: {
            path: '$senderAccount',
            preserveNullAndEmptyArrays: true
        }
    },
    {
        $lookup: {
            from: 'accounts',
            let: { accountId: '$toAccount' },
            pipeline: [
                {
                    $match: {
                        $expr: {
                            $eq: ['$_id', '$$accountId']
                        }
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'user',
                        foreignField: '_id',
                        as: 'owner'
                    }
                },
                {
                    $unwind: {
                        path: '$owner',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $project: {
                        name: 1,
                        accountNumber: 1,
                        status: 1,
                        currency: 1,
                        user: 1,
                        owner: {
                            _id: '$owner._id',
                            name: '$owner.name',
                            email: '$owner.email',
                            role: '$owner.role',
                            systemUser: '$owner.systemUser'
                        }
                    }
                }
            ],
            as: 'receiverAccount'
        }
    },
    {
        $unwind: {
            path: '$receiverAccount',
            preserveNullAndEmptyArrays: true
        }
    },
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
    }
];

const transactionProjection = {
    _id: 1,
    amount: 1,
    status: 1,
    createdAt: 1,
    updatedAt: 1,
    sender: {
        accountId: '$senderAccount._id',
        accountName: '$senderAccount.name',
        accountStatus: '$senderAccount.status',
        currency: '$senderAccount.currency',
        owner: {
            _id: '$senderAccount.owner._id',
            name: '$senderAccount.owner.name',
            email: '$senderAccount.owner.email',
            role: '$senderAccount.owner.role',
            isSystemUser: {
                $eq: ['$senderAccount.owner.systemUser', true]
            }
        }
    },
    receiver: {
        accountId: '$receiverAccount._id',
        accountName: '$receiverAccount.name',
        accountStatus: '$receiverAccount.status',
        currency: '$receiverAccount.currency',
        owner: {
            _id: '$receiverAccount.owner._id',
            name: '$receiverAccount.owner.name',
            email: '$receiverAccount.owner.email',
            role: '$receiverAccount.owner.role',
            isSystemUser: {
                $eq: ['$receiverAccount.owner.systemUser', true]
            }
        }
    },
    initiatedBy: {
        _id: '$initiator._id',
        name: '$initiator.name',
        email: '$initiator.email',
        role: '$initiator.role',
        isSystemUser: {
            $eq: ['$initiator.systemUser', true]
        }
    }
};

const getAdminTransactionsController = async (req, res) => {
    try {
        const { page, limit } = parsePagination(req.query);

        const match = {};

        if (req.query.status !== undefined) {
            if (!ALLOWED_STATUSES.includes(req.query.status)) {
                throw createAdminError(
                    'Invalid transaction status filter.',
                    400
                );
            }

            match.status = req.query.status;
        }

        const startDate = parseDate(
            req.query.startDate,
            'start date'
        );

        const endDate = parseDate(
            req.query.endDate,
            'end date',
            true
        );

        if (startDate && endDate && startDate > endDate) {
            throw createAdminError(
                'Start date cannot be later than end date.',
                400
            );
        }

        if (startDate || endDate) {
            match.createdAt = {};

            if (startDate) {
                match.createdAt.$gte = startDate;
            }

            if (endDate) {
                match.createdAt.$lte = endDate;
            }
        }

        const search = req.query.search;

        if (
            search !== undefined &&
            (
                typeof search !== 'string' ||
                search.trim().length === 0 ||
                search.trim().length > 100
            )
        ) {
            throw createAdminError(
                'Invalid search parameter.',
                400
            );
        }

        const pipeline = [
            { $match: match },
            ...buildTransactionLookups()
        ];

        if (search !== undefined) {
            const searchValue = search.trim();
            const regex = new RegExp(
                escapeRegex(searchValue),
                'i'
            );

            const searchConditions = [
                // Sender and receiver account names
                { 'senderAccount.name': regex },
                { 'receiverAccount.name': regex },

                // Sender and receiver account numbers
                {
                    $expr: {
                        $regexMatch: {
                            input: {
                                $convert: {
                                    input: '$senderAccount.accountNumber',
                                    to: 'string',
                                    onError: '',
                                    onNull: ''
                                }
                            },
                            regex: regex.source,
                            options: 'i'
                        }
                    }
                },
                {
                    $expr: {
                        $regexMatch: {
                            input: {
                                $convert: {
                                    input: '$receiverAccount.accountNumber',
                                    to: 'string',
                                    onError: '',
                                    onNull: ''
                                }
                            },
                            regex: regex.source,
                            options: 'i'
                        }
                    }
                },

                // Sender and receiver owners
                { 'senderAccount.owner.name': regex },
                { 'senderAccount.owner.email': regex },
                { 'receiverAccount.owner.name': regex },
                { 'receiverAccount.owner.email': regex },

                // Transaction initiator
                { 'initiator.name': regex },
                { 'initiator.email': regex },

                // Partial transaction ID
                {
                    $expr: {
                        $regexMatch: {
                            input: {
                                $toString: '$_id'
                            },
                            regex: regex.source,
                            options: 'i'
                        }
                    }
                }
            ];

            pipeline.push({
                $match: {
                    $or: searchConditions
                }
            });
        }

        pipeline.push(
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
                    transactions: [
                        { $skip: (page - 1) * limit },
                        { $limit: limit },
                        { $project: transactionProjection }
                    ]
                }
            }
        );

        const [result] = await Transaction.aggregate(pipeline);

        const transactions = result?.transactions || [];
        const total = result?.metadata?.[0]?.total || 0;
        const totalPages = Math.ceil(total / limit);

        return res.status(200).json({
            message: 'Transactions fetched successfully.',
            transactions,
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
        const statusCode = error.statusCode || 500;

        if (statusCode === 500) {
            console.error(
                'Admin transactions listing error:',
                error
            );
        }

        return res.status(statusCode).json({
            message: statusCode === 500
                ? 'Unable to fetch transactions.'
                : error.message
        });
    }
};

const getAdminTransactionDetailsController = async (req, res) => {
    try {
        const { transactionId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(transactionId)) {
            return res.status(400).json({
                message: 'Invalid transaction ID.'
            });
        }

        const pipeline = [
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(transactionId)
                }
            },
            ...buildTransactionLookups(),
            {
                $project: transactionProjection
            }
        ];

        const transactions = await Transaction.aggregate(pipeline);

        if (!transactions.length) {
            return res.status(404).json({
                message: 'Transaction not found.'
            });
        }

        return res.status(200).json({
            message: 'Transaction details fetched successfully.',
            transaction: transactions[0]
        });
    } catch (error) {
        console.error(
            'Admin transaction details error:',
            error
        );

        return res.status(500).json({
            message: 'Unable to fetch transaction details.'
        });
    }
};

module.exports = {
    getAdminTransactionsController,
    getAdminTransactionDetailsController
};
