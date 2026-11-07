
const mongoose = require('mongoose');
const accountModel = require('../models/account.model');

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

    const account = await accountModel.create({
        user: req.user._id,
        name,
        currency: 'INR'
    });

    res.status(201).json({
        message: 'Account created successfully',
        account
    });
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
