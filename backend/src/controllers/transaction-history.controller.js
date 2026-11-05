
const accountModel = require("../models/account.model");
const transactionModel = require("../models/transaction.model");

async function getUserTransactionsController(req, res) {
    try {
        const accounts = await accountModel
            .find({ user: req.user._id })
            .select("_id");

        const accountIds = accounts.map(account => account._id);

        if (accountIds.length === 0) {
            return res.status(200).json({
                transactions: []
            });
        }

        const transactions = await transactionModel
            .find({
                $or: [
                    { fromAccount: { $in: accountIds } },
                    { toAccount: { $in: accountIds } }
                ]
            })
            .sort({ createdAt: -1, _id: -1 })
            .limit(10)
            .populate("fromAccount", "currency status")
            .populate("toAccount", "currency status")
            .lean();

        return res.status(200).json({
            transactions
        });
    } catch (error) {
        console.error("Transaction history error:", error);

        return res.status(500).json({
            message: "Unable to fetch transaction history."
        });
    }
}

module.exports = {
    getUserTransactionsController
};
