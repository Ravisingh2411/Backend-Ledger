const accountModel = require('../models/account.model');
const auditLogModel = require('../models/auditLog.model');

const getAction = (status) => {
    switch (String(status || '').toUpperCase()) {
        case 'FROZEN':
            return 'ACCOUNT_FROZEN';
        case 'ACTIVE':
            return 'ACCOUNT_UNFROZEN';
        case 'CLOSED':
            return 'ACCOUNT_CLOSED';
        default:
            return 'ACCOUNT_STATUS_CHANGE';
    }
};

const auditAdminAccountStatus = async (req, res, next) => {
    const accountId = req.params.accountId;
    const requestedStatus = String(req.body?.status || '').toUpperCase();

    const admin = req.user;

    let previousAccount = null;

    try {
        previousAccount = await accountModel
            .findById(accountId)
            .populate('user', 'name email')
            .lean();
    } catch (error) {
        console.error('Audit middleware account lookup failed:', error.message);
    }

    const originalJson = res.json.bind(res);
    let responseBody = null;

    res.json = (body) => {
        responseBody = body;
        return originalJson(body);
    };

    res.on('finish', () => {
        const outcome = res.statusCode < 400 ? 'SUCCESS' : 'FAILED';

        const targetUser = previousAccount?.user;

        const logData = {
            admin: admin?._id,
            adminName: admin?.name || 'Unknown Admin',
            adminEmail: admin?.email || '',
            action: getAction(requestedStatus),
            targetAccount: accountId,
            accountName: previousAccount?.name || '',
            targetUser: targetUser?._id || null,
            targetUserName: targetUser?.name || '',
            targetUserEmail: targetUser?.email || '',
            previousStatus: previousAccount?.status || '',
            newStatus:
                outcome === 'SUCCESS'
                    ? requestedStatus
                    : previousAccount?.status || '',
            outcome,
            statusCode: res.statusCode,
            description:
                outcome === 'SUCCESS'
                    ? `Admin changed account status to ${requestedStatus}.`
                    : `Admin attempted to change account status to ${requestedStatus}.`,
            failureReason:
                outcome === 'FAILED'
                    ? responseBody?.message ||
                      responseBody?.error ||
                      'The account status change request failed.'
                    : ''
        };

        auditLogModel.create(logData).catch((error) => {
            console.error('Unable to save admin audit log:', error.message);
        });
    });

    next();
};

module.exports = auditAdminAccountStatus;