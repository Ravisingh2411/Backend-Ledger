
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    fromAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'account',
        required: true,
        index: true
    },
    toAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'account',
        required: true,
        index: true
    },
    initiatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,
        index: true
    },
    transactionType: {
        type: String,
        enum: ['TRANSFER', 'WELCOME_BONUS'],
        default: 'TRANSFER',
        required: true
    },
    status: {
        type: String,
        enum: {
            values: ['PENDING', 'COMPLETED', 'FAILED', 'REVERSED'],
            message: 'Invalid transaction status'
        },
        default: 'PENDING',
        required: true
    },
    amount: {
        type: Number,
        required: true,
        validate: {
            validator: value =>
                Number.isFinite(value) &&
                value > 0 &&
                Number.isSafeInteger(value * 100),
            message: 'Amount must be a positive valid monetary value'
        }
    },
    idempotencyKey: {
        type: String,
        required: true,
        trim: true,
        minlength: 1,
        maxlength: 128
    }
}, {
    timestamps: true
});

transactionSchema.index(
    { initiatedBy: 1, idempotencyKey: 1 },
    { unique: true }
);

const transactionModel = mongoose.model(
    'transaction',
    transactionSchema
);

module.exports = transactionModel;
