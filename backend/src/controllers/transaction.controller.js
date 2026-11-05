const transactionModel = require("../models/transaction.model")
const ledgerModel = require("../models/ledger.model")
const accountModel = require("../models/account.model")
const emailService = require("../services/email.service")
const mongoose = require("mongoose")

/**
 * Create a new transaction
 *
 * 1. Validate request
 * 2. Validate idempotency key
 * 3. Check account status
 * 4. Derive sender balance from ledger
 * 5. Create transaction (PENDING)
 * 6. Create DEBIT ledger entry
 * 7. Create CREDIT ledger entry
 * 8. Mark transaction COMPLETED
 * 9. Commit MongoDB session
 * 10. Send email notifications
 */
async function createTransaction(req, res) {
    /**
     * 1. Validate request
     */
    const {
        fromAccount,
        toAccount,
        amount,
        idempotencyKey
    } = req.body

    if (!fromAccount || !toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({
            message: "FromAccount, toAccount, amount and idempotencyKey are required"
        })
    }

    const fromUserAccount = await accountModel
        .findOne({ _id: fromAccount })
        .populate("user")

    const toUserAccount = await accountModel
        .findOne({ _id: toAccount })
        .populate("user")

    if (!fromUserAccount || !toUserAccount) {
        return res.status(400).json({
            message: "Invalid fromAccount or toAccount"
        })
    }

    /**
     * 2. Validate idempotency key
     */
    const isTransactionAlreadyExists =
        await transactionModel.findOne({
            idempotencyKey
        })

    if (isTransactionAlreadyExists) {
        if (isTransactionAlreadyExists.status === "COMPLETED") {
            return res.status(200).json({
                message: "Transaction already processed",
                transaction: isTransactionAlreadyExists
            })
        }

        if (isTransactionAlreadyExists.status === "PENDING") {
            return res.status(200).json({
                message: "Transaction is still processing"
            })
        }

        if (isTransactionAlreadyExists.status === "FAILED") {
            return res.status(500).json({
                message: "Transaction processing failed, please retry"
            })
        }

        if (isTransactionAlreadyExists.status === "REVERSED") {
            return res.status(500).json({
                message: "Transaction was reversed, please retry"
            })
        }
    }

    /**
     * 3. Check account status
     */
    if (
        fromUserAccount.status !== "ACTIVE" ||
        toUserAccount.status !== "ACTIVE"
    ) {
        return res.status(400).json({
            message:
                "Both fromAccount and toAccount must be ACTIVE to process transaction"
        })
    }

    /**
     * 4. Derive sender balance from ledger
     */
    const balance = await fromUserAccount.getBalance()

    if (balance < amount) {
        return res.status(400).json({
            message: `Insufficient balance. Current balance is ${balance}. Requested amount is ${amount}`
        })
    }

    let transaction
    let session
    try {

        session = await mongoose.startSession()
        session.startTransaction()

        /**
         * 5. Create transaction (PENDING)
         */
        transaction = (
            await transactionModel.create(
                [{
                    fromAccount,
                    toAccount,
                    amount,
                    idempotencyKey,
                    status: "PENDING"
                }],
                { session }
            )
        )[0]

        /**
         * 6. Create DEBIT ledger entry
         */
        await ledgerModel.create(
            [{
                account: fromAccount,
                amount,
                transaction: transaction._id,
                type: "DEBIT"
            }],
            { session }
        )

        /**
         * Temporary delay
         */
        await new Promise((resolve) =>
            setTimeout(resolve, 15 * 1000)
        )

        /**
         * 7. Create CREDIT ledger entry
         */
        await ledgerModel.create(
            [{
                account: toAccount,
                amount,
                transaction: transaction._id,
                type: "CREDIT"
            }],
            { session }
        )

        /**
         * 8. Mark transaction COMPLETED
         */
        await transactionModel.findOneAndUpdate(
            { _id: transaction._id },
            { status: "COMPLETED" },
            { session }
        )

        /**
         * 9. Commit MongoDB transaction
         */
        await session.commitTransaction()
        session.endSession()

    } catch (error) {

        console.log("Transaction error:", error)

        if (session) {
            try {
                await session.abortTransaction()
                session.endSession()
            } catch (sessionError) {
                console.log("Session cleanup error:", sessionError)
            }
        }

        /**
         * FAILURE EMAIL → SENDER ONLY
         */
        try {
            await emailService.sendTransactionFailureEmail(
                req.user.email,
                req.user.name,
                amount,
                toAccount
            )
        } catch (emailError) {
            console.log("Failed email error:", emailError)
        }

        return res.status(400).json({
            message:
                "Transaction failed, please retry after sometime"
        })
    }

    /**
     * 10. SUCCESS EMAIL → SENDER
     */
    try {
        await emailService.sendTransactionEmail(
            req.user.email,
            req.user.name,
            amount,
            toAccount
        )
    } catch (emailError) {
        console.log("Sender email error:", emailError)
    }

    /**
     * SUCCESS EMAIL → RECEIVER
     */
    try {
        await emailService.sendMoneyReceivedEmail(
            toUserAccount.user.email,
            toUserAccount.user.name,
            amount,
            fromAccount
        )
    } catch (emailError) {
        console.log("Receiver email error:", emailError)
    }
    return res.status(201).json({
        message: "Transaction completed successfully",
        transaction
    })
}


/**
 * Create Initial Funds Transaction
 */
async function createInitialFundsTransaction(req, res) {

    const {
        toAccount,
        amount,
        idempotencyKey
    } = req.body

    if (!toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({
            message:
                "toAccount, amount and idempotencyKey are required"
        })
    }

    /**
     * Receiver account
     */
    const toUserAccount = await accountModel
        .findOne({ _id: toAccount })
        .populate("user")

    if (!toUserAccount) {
        return res.status(400).json({
            message: "Invalid toAccount"
        })
    }

    /**
     * System user account
     */
    const fromUserAccount = await accountModel.findOne({
        user: req.user._id
    })

    if (!fromUserAccount) {
        return res.status(400).json({
            message: "System user account not found"
        })
    }

    let session
    let transaction

    try {
        session = await mongoose.startSession()
        session.startTransaction()

        /**
         * Create transaction
         */
        transaction = new transactionModel({
            fromAccount: fromUserAccount._id,
            toAccount,
            amount,
            idempotencyKey,
            status: "PENDING"
        })

        /**
         * DEBIT system account
         */
        await ledgerModel.create(
            [{
                account: fromUserAccount._id,
                amount,
                transaction: transaction._id,
                type: "DEBIT"
            }],
            { session }
        )

        /**
         * CREDIT receiver account
         */
        await ledgerModel.create(
            [{
                account: toAccount,
                amount,
                transaction: transaction._id,
                type: "CREDIT"
            }],
            { session }
        )

        /**
         * Mark transaction COMPLETED
         */
        transaction.status = "COMPLETED"
        await transaction.save({ session })

        /**
         * Commit transaction
         */
        await session.commitTransaction()
        session.endSession()

    } catch (error) {

        console.log("Initial funds transaction error:", error)

        if (session) {
            try {
                await session.abortTransaction()
                session.endSession()
            } catch (sessionError) {
                console.log("Session cleanup error:", sessionError)
            }
        }

        /**
         * FAILURE EMAIL → SENDER/SYSTEM USER ONLY
         */

        try {
            await emailService.sendTransactionFailureEmail(
                req.user.email,
                req.user.name,
                amount,
                toAccount
            )
        } catch (emailError) {
            console.log("Failed email error:", emailError)
        }

        return res.status(400).json({
            message:
                "Initial funds transaction failed, please retry after sometime"
        })
    }

    /**
     * SUCCESS EMAIL → SENDER/SYSTEM USER
     */
    try {
        await emailService.sendTransactionEmail(
            req.user.email,
            req.user.name,
            amount,
            toAccount
        )
    } catch (emailError) {
        console.log("Sender email error:", emailError)
    }

    /**
     * MONEY RECEIVED EMAIL → RECEIVER
     */
    try {
        await emailService.sendMoneyReceivedEmail(
            toUserAccount.user.email,
            toUserAccount.user.name,
            amount,
            fromUserAccount._id
        )
    } catch (emailError) {
        console.log("Receiver email error:", emailError)
    }

    return res.status(201).json({
        message:
            "Initial funds transaction completed successfully",
        transaction
    })
}


module.exports = {
    createTransaction,
    createInitialFundsTransaction
}