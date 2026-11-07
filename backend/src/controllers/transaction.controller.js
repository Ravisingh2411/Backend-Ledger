
const mongoose = require("mongoose");

const transactionModel = require("../models/transaction.model");
const ledgerModel = require("../models/ledger.model");
const accountModel = require("../models/account.model");
const emailService = require("../services/email.service");

function createError(message, statusCode = 400) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

function isValidAmount(amount) {
    return (
        typeof amount === "number" &&
        Number.isFinite(amount) &&
        amount > 0 &&
        Number.isSafeInteger(amount * 100)
    );
}

function getExistingTransactionResponse(transaction) {
    if (transaction.status === "COMPLETED") {
        return {
            statusCode: 200,
            body: {
                message: "Transaction already processed",
                transaction
            }
        };
    }

    if (transaction.status === "PENDING") {
        return {
            statusCode: 202,
            body: {
                message: "Transaction is still processing"
            }
        };
    }

    return {
        statusCode: 409,
        body: {
            message: "This transaction cannot be processed again"
        }
    };
}

function matchesExistingTransaction(
    transaction,
    fromAccount,
    toAccount,
    amount
) {
    return (
        transaction.fromAccount.toString() === fromAccount &&
        transaction.toAccount.toString() === toAccount &&
        transaction.amount === amount
    );
}

async function createTransaction(req, res) {
    const {
        fromAccount,
        toAccount,
        amount,
        idempotencyKey
    } = req.body;

    if (
        !fromAccount ||
        !toAccount ||
        amount === undefined ||
        !idempotencyKey
    ) {
        return res.status(400).json({
            message: "FromAccount, toAccount, amount and idempotencyKey are required"
        });
    }

    if (
        !mongoose.isValidObjectId(fromAccount) ||
        !mongoose.isValidObjectId(toAccount)
    ) {
        return res.status(400).json({
            message: "Invalid account ID"
        });
    }

    const senderId = new mongoose.Types.ObjectId(fromAccount).toString();
    const receiverId = new mongoose.Types.ObjectId(toAccount).toString();
    const userId = req.user._id;

    const normalizedKey =
        typeof idempotencyKey === "string"
            ? idempotencyKey.trim()
            : "";

    if (!isValidAmount(amount)) {
        return res.status(400).json({
            message: "Amount must be a positive valid monetary value with at most two decimal places"
        });
    }

    if (!normalizedKey || normalizedKey.length > 128) {
        return res.status(400).json({
            message: "Invalid idempotency key"
        });
    }

    if (senderId === receiverId) {
        return res.status(400).json({
            message: "Sender and receiver accounts cannot be the same"
        });
    }

    try {
        // Verify sender ownership.
        const sender = await accountModel.findOne({
            _id: senderId,
            user: userId
        });

        if (!sender) {
            return res.status(404).json({
                message: "Sender account not found or does not belong to you"
            });
        }

        // Check user-scoped idempotency first.
        const existingTransaction = await transactionModel.findOne({
            initiatedBy: userId,
            idempotencyKey: normalizedKey
        });

        if (existingTransaction) {
            if (
                !matchesExistingTransaction(
                    existingTransaction,
                    senderId,
                    receiverId,
                    amount
                )
            ) {
                return res.status(409).json({
                    message: "This idempotency key has already been used for a different request"
                });
            }

            const response =
                getExistingTransactionResponse(existingTransaction);

            return res.status(response.statusCode).json(response.body);
        }

        // Legacy transactions have no verified initiator.
        // Never reuse their idempotency keys.
        const legacyTransaction = await transactionModel.findOne({
            idempotencyKey: normalizedKey,
            initiatedBy: null
        });

        if (legacyTransaction) {
            return res.status(409).json({
                message: "This idempotency key belongs to a legacy transaction. Please use a new idempotency key."
            });
        }

        let session;
        let transaction;

        try {
            session = await mongoose.startSession();

            await session.withTransaction(async () => {
                const accounts = await accountModel.find({
                    _id: {
                        $in: [senderId, receiverId]
                    }
                })
                    .populate("user")
                    .session(session);

                const senderAccount = accounts.find(
                    account => account._id.toString() === senderId
                );

                const receiverAccount = accounts.find(
                    account => account._id.toString() === receiverId
                );

                if (!senderAccount) {
                    throw createError("Sender account not found", 404);
                }

                if (
                    !senderAccount.user ||
                    senderAccount.user._id.toString() !== userId.toString()
                ) {
                    throw createError(
                        "Sender account does not belong to you",
                        403
                    );
                }

                if (!receiverAccount || !receiverAccount.user) {
                    throw createError("Receiver account not found", 404);
                }

                if (
                    senderAccount.status !== "ACTIVE" ||
                    receiverAccount.status !== "ACTIVE"
                ) {
                    throw createError(
                        "Both accounts must be ACTIVE to process a transaction"
                    );
                }

                if (
                    senderAccount.currency !== receiverAccount.currency
                ) {
                    throw createError(
                        "Sender and receiver accounts must have the same currency"
                    );
                }

                // Update account documents to create write conflicts
                // for concurrent transfers involving the same account.
                const orderedAccounts = [senderId, receiverId].sort();

                for (const accountId of orderedAccounts) {
                    const filter = {
                        _id: accountId,
                        status: "ACTIVE"
                    };

                    if (accountId === senderId) {
                        filter.user = userId;
                    }

                    const lockedAccount =
                        await accountModel.findOneAndUpdate(
                            filter,
                            {
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

                    if (!lockedAccount) {
                        throw createError(
                            "An account changed status or is no longer available. Please retry."
                        );
                    }
                }

                // Calculate balance from immutable ledger entries.
                const balance = await senderAccount.getBalance({
                    session
                });

                if (balance < amount) {
                    throw createError(
                        `Insufficient balance. Current balance is ${balance}. Requested amount is ${amount}`
                    );
                }

                transaction = new transactionModel({
                    fromAccount: senderId,
                    toAccount: receiverId,
                    initiatedBy: userId,
                    amount,
                    idempotencyKey: normalizedKey,
                    status: "PENDING"
                });

                await transaction.save({ session });

                // Debit sender.
                await ledgerModel.create(
                    [{
                        account: senderId,
                        amount,
                        transaction: transaction._id,
                        type: "DEBIT"
                    }],
                    { session }
                );

                // Credit receiver.
                await ledgerModel.create(
                    [{
                        account: receiverId,
                        amount,
                        transaction: transaction._id,
                        type: "CREDIT"
                    }],
                    { session }
                );

                // Mark transaction completed atomically.
                transaction.status = "COMPLETED";

                await transaction.save({ session });
            }, {
                readPreference: "primary",
                readConcern: {
                    level: "snapshot"
                },
                writeConcern: {
                    w: "majority"
                }
            });
        } finally {
            if (session) {
                await session.endSession();
            }
        }

        // Notifications are sent only after the transaction commits.
        try {
            await emailService.sendTransactionEmail(
                req.user.email,
                req.user.name,
                amount,
                receiverId
            );
        } catch (emailError) {
            console.error(
                "Sender notification failed:",
                emailError.message
            );
        }

        try {
            const receiverAccount = await accountModel
                .findById(receiverId)
                .populate("user");

            if (receiverAccount?.user) {
                await emailService.sendMoneyReceivedEmail(
                    receiverAccount.user.email,
                    receiverAccount.user.name,
                    amount,
                    senderId
                );
            }
        } catch (emailError) {
            console.error(
                "Receiver notification failed:",
                emailError.message
            );
        }

        return res.status(201).json({
            message: "Transaction completed successfully",
            transaction
        });

    } catch (error) {
        console.error("Transaction error:", error);

        if (error.code === 11000) {
            const duplicateTransaction =
                await transactionModel.findOne({
                    initiatedBy: userId,
                    idempotencyKey: normalizedKey
                });

            if (
                duplicateTransaction &&
                matchesExistingTransaction(
                    duplicateTransaction,
                    senderId,
                    receiverId,
                    amount
                )
            ) {
                const response =
                    getExistingTransactionResponse(duplicateTransaction);

                return res.status(response.statusCode).json(response.body);
            }

            return res.status(409).json({
                message: "This idempotency key has already been used"
            });
        }

        if (error.statusCode) {
            return res.status(error.statusCode).json({
                message: error.message
            });
        }

        return res.status(500).json({
            message: "Transaction failed. Please retry after some time."
        });
    }
}

module.exports = {
    createTransaction
};
