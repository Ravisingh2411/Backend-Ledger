const express = require('express');

const {
    authAdminMiddleware
} = require('../middlewares/auth.middleware');

const {
    getAdminDashboardController,
    getAdminUsersController,
    getAdminUserDetailsController,
    getAdminAccountsController,
    getAdminAccountDetailsController,
    updateAdminAccountStatusController
} = require('../controllers/admin.controller');

const {
    getAdminTransactionsController,
    getAdminTransactionDetailsController
} = require('../controllers/admin-transaction.controller');

const {
    getAdminAuditLogsController
} = require('../controllers/admin-audit.controller');

const auditAdminAccountStatus = require('../middlewares/admin-audit.middleware');

const router = express.Router();

router.use(authAdminMiddleware);

router.get('/dashboard', getAdminDashboardController);

router.get('/users', getAdminUsersController);
router.get('/users/:userId', getAdminUserDetailsController);

router.get('/accounts', getAdminAccountsController);
router.get('/accounts/:accountId', getAdminAccountDetailsController);

router.patch(
    '/accounts/:accountId/status',
    auditAdminAccountStatus,
    updateAdminAccountStatusController
);

router.get('/transactions', getAdminTransactionsController);
router.get(
    '/transactions/:transactionId',
    getAdminTransactionDetailsController
);

router.get('/audit-logs', getAdminAuditLogsController);

module.exports = router;