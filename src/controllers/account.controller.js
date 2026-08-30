const accountModel = require('../models/account.model');

/**
 * - POST /api/accounts/
 * - Create a new account
 * - Protected Route
 */
async function createAccountController(req, res) {
    const user = req.user;

    const account = await accountModel.create({
        user: user._id
    });

    res.status(201).json({
        message: "Account created successfully",
        account
    });
}

/**
 * - GET /api/accounts/
 * - Get all accounts of the logged-in user
 * - Protected Route
 */
async function getUserAccountsController(req, res) {
    const accounts = await accountModel.find({
        user: req.user._id
    });

    res.status(200).json({
        accounts
    });
}

/**
 * - GET /api/accounts/balance/:accountId
 * * Get Balance of a account
 * - Protected Route
*/
async function getAccountBalanceController(req, res) {
    const { accountId } = req.params;
    const account = await accountModel.findOne({
        _id: accountId,
        user: req.user._id
    })
    if (!account) {
        return res.status(404).json({
            message: "Account not found"
        })
    }
    const balance = await account.getBalance();
    res.status(200).json({
        accountId: account._id,
        balance: balance
    })
}

module.exports = {
    createAccountController,
    getUserAccountsController,
    getAccountBalanceController
};