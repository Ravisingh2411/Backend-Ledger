const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
    {
        admin: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: true,
            index: true
        },
        adminName: {
            type: String,
            default: 'Unknown Admin',
            trim: true
        },
        adminEmail: {
            type: String,
            default: '',
            trim: true,
            lowercase: true
        },
        action: {
            type: String,
            enum: [
                'ACCOUNT_FROZEN',
                'ACCOUNT_UNFROZEN',
                'ACCOUNT_CLOSED',
                'ACCOUNT_STATUS_CHANGE'
            ],
            required: true,
            index: true
        },
        targetAccount: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'account',
            default: null,
            index: true
        },
        accountName: {
            type: String,
            default: ''
        },
        targetUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            default: null
        },
        targetUserName: {
            type: String,
            default: ''
        },
        targetUserEmail: {
            type: String,
            default: ''
        },
        previousStatus: {
            type: String,
            default: ''
        },
        newStatus: {
            type: String,
            default: ''
        },
        outcome: {
            type: String,
            enum: ['SUCCESS', 'FAILED'],
            required: true,
            index: true
        },
        statusCode: {
            type: Number,
            default: 200
        },
        description: {
            type: String,
            default: ''
        },
        failureReason: {
            type: String,
            default: ''
        }
    },
    {
        timestamps: true
    }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ outcome: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);

