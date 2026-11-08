const auditLogModel = require('../models/auditLog.model');

const getAdminAuditLogsController = async (req, res) => {
    try {
        const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
        const limit = Math.min(
            100,
            Math.max(1, Number.parseInt(req.query.limit, 10) || 10)
        );

        const { action, outcome, search } = req.query;

        const filter = {};

        const allowedActions = [
            'ACCOUNT_FROZEN',
            'ACCOUNT_UNFROZEN',
            'ACCOUNT_CLOSED',
            'ACCOUNT_STATUS_CHANGE'
        ];

        if (action && allowedActions.includes(action)) {
            filter.action = action;
        }

        if (outcome && ['SUCCESS', 'FAILED'].includes(outcome)) {
            filter.outcome = outcome;
        }

        if (search && String(search).trim()) {
            const escapedSearch = String(search)
                .trim()
                .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

            const regex = new RegExp(escapedSearch, 'i');

            filter.$or = [
                { adminName: regex },
                { adminEmail: regex },
                { accountName: regex },
                { targetUserName: regex },
                { targetUserEmail: regex },
                { description: regex }
            ];

            if (/^[a-f\d]{24}$/i.test(String(search).trim())) {
                filter.$or.push({
                    targetAccount: String(search).trim()
                });
            }
        }

        const skip = (page - 1) * limit;

        const [logs, total] = await Promise.all([
            auditLogModel
                .find(filter)
                .populate('admin', 'name email')
                .populate('targetUser', 'name email')
                .populate('targetAccount', 'name status')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),

            auditLogModel.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,
            logs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNextPage: page * limit < total,
                hasPreviousPage: page > 1
            }
        });
    } catch (error) {
        console.error('Get admin audit logs error:', error);

        return res.status(500).json({
            success: false,
            message: 'Unable to fetch audit logs.'
        });
    }
};

module.exports = {
    getAdminAuditLogsController
};