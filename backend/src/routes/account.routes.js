
const express = require('express');

const authMiddleware = require('../middlewares/auth.middleware');
const accountController = require('../controllers/account.controller');

const router = express.Router();

router.use(authMiddleware.authMiddleware);

// Create account
router.post(
    '/',
    accountController.createAccountController
);

// Get all user accounts
router.get(
    '/',
    accountController.getUserAccountsController
);

// Get account balance
router.get(
    '/balance/:accountId',
    accountController.getAccountBalanceController
);

// Freeze account
router.patch(
    '/:accountId/freeze',
    accountController.freezeAccountController
);

// Unfreeze account
router.patch(
    '/:accountId/unfreeze',
    accountController.unfreezeAccountController
);

// Close account
router.patch(
    '/:accountId/close',
    accountController.closeAccountController
);

module.exports = router;
