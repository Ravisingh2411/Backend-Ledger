
const mongoose = require('mongoose');
const ledgerModel = require('../models/ledger.model');

const accountSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: [true, "Account must be associated with a user"],
        index: true
    },
    name: {
        type: String,
        required: [true, "Account name is required"],
        trim: true,
        minlength: [2, "Account name must be at least 2 characters"],
        maxlength: [30, "Account name cannot exceed 30 characters"]
    },
    status: {
        type: String,
        enum: {
            values: ["ACTIVE", "FROZEN", "CLOSED"],
            message: "Status can be either ACTIVE, FROZEN or CLOSED"
        },
        default: "ACTIVE"
    },
    currency: {
        type: String,
        required: [true, "Currency is required for creating an account"],
        default: "INR"
    },
    transactionVersion: {
        type: Number,
        default: 0,
        min: 0,
        select: false
    }
}, {
    timestamps: true
});

accountSchema.index({ user: 1, status: 1 });

accountSchema.methods.getBalance = async function(options = {}) {
    const balanceQuery = ledgerModel.aggregate([
        {
            $match: {
                account: this._id
            }
        },
        {
            $group: {
                _id: null,
                totalCredit: {
                    $sum: {
                        $cond: [
                            { $eq: ["$type", "CREDIT"] },
                            "$amount",
                            0
                        ]
                    }
                },
                totalDebit: {
                    $sum: {
                        $cond: [
                            { $eq: ["$type", "DEBIT"] },
                            "$amount",
                            0
                        ]
                    }
                }
            }
        },
        {
            $project: {
                _id: 0,
                balance: {
                    $subtract: ["$totalCredit", "$totalDebit"]
                }
            }
        }
    ]);

    if (options.session) {
        balanceQuery.session(options.session);
    }

    const balanceData = await balanceQuery;

    return balanceData.length > 0 ? balanceData[0].balance : 0;
};

const accountModel = mongoose.model("account", accountSchema);

module.exports = accountModel;
