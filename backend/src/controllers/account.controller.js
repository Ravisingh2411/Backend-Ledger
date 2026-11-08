
const mongoose = require('mongoose');

const accountModel = require('../models/account.model');
const userModel = require('../models/user.model');
const transactionModel = require('../models/transaction.model');
const ledgerModel = require('../models/ledger.model');

const WELCOME_CREDIT_AMOUNT = 10000;

function createError(message, statusCode = 400) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

async function createAccountController(req, res) {
    const name =
        typeof req.body?.name === 'string'
            ? req.body.name.trim()
            : '';

    if (name.length < 2 || name.length > 30) {
        return res.status(400).json({
            message: 'Account name must be between 2 and 30 characters'
        });
    }

    let session;

    try {
        session = await mongoose.startSession();

        let account;
        let welcomeCreditGranted = false;

        await session.withTransaction(async () => {
            // Create the customer's account.
            account = new accountModel({
                user: req.user._id,
                name,
                currency: 'INR'
            });

            await account.save({ session });

            // Only normal customers can receive the welcome credit.
            // This conditional update allows the credit only once
            // for each customer, even if they create multiple accounts.
            if (req.user.role === 'user') {
                const bonusClaim = await userModel.findOneAndUpdate(
                    {
                        _id: req.user._id,
                        role: 'user',
                        systemUser: { $ne: true },
                        welcomeCreditGranted: { $ne: true }
                    },
                    {
                        $set: {
                            welcomeCreditGranted: true,
                            welcomeCreditGrantedAt: new Date()
                        }
                    },
                    {
                        new: true,
                        session,
                        runValidators: true
                    }
                );

                if (bonusClaim) {
                    // Create a dedicated welcome bonus transaction.
                    // Both account references point to the customer's
                    // first account because this is not a normal transfer.
                    const welcomeTransaction = new transactionModel({
                        fromAccount: account._id,
                        toAccount: account._id,
                        initiatedBy: req.user._id,
                        transactionType: 'WELCOME_BONUS',
                        amount: WELCOME_CREDIT_AMOUNT,
                        idempotencyKey:
                            `WELCOME_BONUS:${req.user._id}`,
                        status: 'COMPLETED'
                    });

                    await welcomeTransaction.save({ session });

                    // Credit the account through the immutable ledger.
                    await ledgerModel.create(
                        [{
                            account: account._id,
                            amount: WELCOME_CREDIT_AMOUNT,
                            transaction: welcomeTransaction._id,
                            type: 'CREDIT'
                        }],
                        { session }
                    );

                    welcomeCreditGranted = true;
                }
            }
        }, {
            readPreference: 'primary',
            readConcern: {
                level: 'snapshot'
            },
            writeConcern: {
                w: 'majority'
            }
        });

        return res.status(201).json({
            message: welcomeCreditGranted
                ? 'Account created successfully. ₹10,000 welcome credit added.'
                : 'Account created successfully.',
            account,
            welcomeCredit: {
                credited: welcomeCreditGranted,
                amount: welcomeCreditGranted
                    ? WELCOME_CREDIT_AMOUNT
                    : 0
            }
        });

    } catch (error) {
        console.error('Account creation error:', error);

        return res.status(error.statusCode || 500).json({
            message: error.statusCode
                ? error.message
                : 'Unable to create account. Please try again later.'
        });

    } finally {
        if (session) {
            await session.endSession();
        }
    }
}

async function getUserAccountsController(req, res) {
    const accounts = await accountModel.find({
        user: req.user._id
    }).sort({ createdAt: -1 });

    res.status(200).json({
        accounts
    });
}

async function getAccountBalanceController(req, res) {
    const { accountId } = req.params;

    if (!mongoose.isValidObjectId(accountId)) {
        return res.status(400).json({
            message: 'Invalid account ID'
        });
    }

    const account = await accountModel.findOne({
        _id: accountId,
        user: req.user._id
    });

    if (!account) {
        return res.status(404).json({
            message: 'Account not found'
        });
    }

    const balance = await account.getBalance();

    res.status(200).json({
        accountId: account._id,
        balance
    });
}

async function changeAccountStatus(req, res, action) {
    const { accountId } = req.params;

    if (!mongoose.isValidObjectId(accountId)) {
        return res.status(400).json({
            message: 'Invalid account ID'
        });
    }

    let session;

    try {
        session = await mongoose.startSession();

        let updatedAccount;

        await session.withTransaction(async () => {
            const account = await accountModel.findOne({
                _id: accountId,
                user: req.user._id
            }).session(session);

            if (!account) {
                throw createError('Account not found', 404);
            }

            if (action === 'freeze') {
                if (account.status !== 'ACTIVE') {
                    throw createError(
                        'Only ACTIVE accounts can be frozen',
                        409
                    );
                }

                updatedAccount = await accountModel.findOneAndUpdate(
                    {
                        _id: accountId,
                        user: req.user._id,
                        status: 'ACTIVE'
                    },
                    {
                        $set: {
                            status: 'FROZEN'
                        },
                        $inc: {
                            transactionVersion: 1
                        }
                    },
                    {
                        returnDocument: 'after',
                        session,
                        runValidators: true
                    }
                );

                if (!updatedAccount) {
                    throw createError(
                        'Account status changed. Please retry.',
                        409
                    );
                }
            }

            if (action === 'unfreeze') {
                if (account.status !== 'FROZEN') {
                    throw createError(
                        'Only FROZEN accounts can be unfrozen',
                        409
                    );
                }

                updatedAccount = await accountModel.findOneAndUpdate(
                    {
                        _id: accountId,
                        user: req.user._id,
                        status: 'FROZEN'
                    },
                    {
                        $set: {
                            status: 'ACTIVE'
                        },
                        $inc: {
                            transactionVersion: 1
                        }
                    },
                    {
                        returnDocument: 'after',
                        session,
                        runValidators: true
                    }
                );

                if (!updatedAccount) {
                    throw createError(
                        'Account status changed. Please retry.',
                        409
                    );
                }
            }

            if (action === 'close') {
                if (!['ACTIVE', 'FROZEN'].includes(account.status)) {
                    throw createError(
                        'This account cannot be closed',
                        409
                    );
                }

                const lockedAccount = await accountModel.findOneAndUpdate(
                    {
                        _id: accountId,
                        user: req.user._id,
                        status: account.status
                    },
                    {
                        $inc: {
                            transactionVersion: 1
                        }
                    },
                    {
                        returnDocument: 'after',
                        session
                    }
                );

                if (!lockedAccount) {
                    throw createError(
                        'Account status changed. Please retry.',
                        409
                    );
                }

                const balance = await lockedAccount.getBalance({
                    session
                });

                if (balance !== 0) {
                    throw createError(
                        `Account cannot be closed. Current balance is ${balance}. Please transfer or settle the remaining balance first.`,
                        409
                    );
                }

                updatedAccount = await accountModel.findOneAndUpdate(
                    {
                        _id: accountId,
                        user: req.user._id,
                        status: account.status
                    },
                    {
                        $set: {
                            status: 'CLOSED'
                        }
                    },
                    {
                        returnDocument: 'after',
                        session,
                        runValidators: true
                    }
                );

                if (!updatedAccount) {
                    throw createError(
                        'Unable to close account. Please retry.',
                        409
                    );
                }
            }
        }, {
            readPreference: 'primary',
            readConcern: {
                level: 'snapshot'
            },
            writeConcern: {
                w: 'majority'
            }
        });

        const messages = {
            freeze: 'Account frozen successfully',
            unfreeze: 'Account unfrozen successfully',
            close: 'Account closed successfully'
        };

        return res.status(200).json({
            message: messages[action],
            account: updatedAccount
        });

    } catch (error) {
        console.error(`Account ${action} error:`, error);

        return res.status(error.statusCode || 500).json({
            message: error.statusCode
                ? error.message
                : 'Unable to update account. Please try again later.'
        });

    } finally {
        if (session) {
            await session.endSession();
        }
    }
}

async function freezeAccountController(req, res) {
    return changeAccountStatus(req, res, 'freeze');
}

async function unfreezeAccountController(req, res) {
    return changeAccountStatus(req, res, 'unfreeze');
}

async function closeAccountController(req, res) {
    return changeAccountStatus(req, res, 'close');
}

module.exports = {
    createAccountController,
    getUserAccountsController,
    getAccountBalanceController,
    freezeAccountController,
    unfreezeAccountController,
    closeAccountController
};
