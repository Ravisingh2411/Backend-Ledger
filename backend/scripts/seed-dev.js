
require("dotenv").config();

const crypto = require("crypto");
const mongoose = require("mongoose");

async function main() {
    if (process.env.NODE_ENV !== "development") {
        throw new Error("Seed script is allowed only in development mode.");
    }

    if (process.env.ALLOW_DEV_SEED !== "true") {
        throw new Error("Development seeding is not enabled.");
    }

    const testEmail = process.env.DEV_SEED_USER_EMAIL?.trim().toLowerCase();
    const testPassword = process.env.DEV_SEED_USER_PASSWORD;

    if (
        !testEmail ||
        !testEmail.endsWith(".invalid") ||
        !testPassword ||
        testPassword.length < 16
    ) {
        throw new Error(
            "Configure a .invalid test email and a password of at least 16 characters."
        );
    }

    if (!process.env.MONGO_URI) {
        throw new Error("Database configuration is missing.");
    }

    const userModel = require("../src/models/user.model");
    const accountModel = require("../src/models/account.model");
    const transactionModel = require("../src/models/transaction.model");
    const ledgerModel = require("../src/models/ledger.model");

    let session;

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to database.");

        session = await mongoose.startSession();

        let result;

        await session.withTransaction(async () => {
            async function getOrCreateUser({
                email,
                name,
                password,
                systemUser = false
            }) {
                let user = await userModel
                    .findOne({ email })
                    .select("+systemUser")
                    .session(session);

                if (user) {
                    if (Boolean(user.systemUser) !== systemUser) {
                        throw new Error(
                            `User type mismatch for seed identity: ${email}`
                        );
                    }

                    return user;
                }

                user = new userModel({
                    email,
                    name,
                    password,
                    systemUser
                });

                await user.save({ session });

                return user;
            }

            async function getOrCreateAccounts(user) {
                const accounts = await accountModel
                    .find({ user: user._id })
                    .sort({ _id: 1 })
                    .session(session);

                if (accounts.length === 2) {
                    return accounts;
                }

                if (accounts.length !== 0) {
                    throw new Error(
                        "Unexpected account count for a seed user. Aborting safely."
                    );
                }

                const firstAccount = new accountModel({
                    user: user._id,
                    currency: "INR",
                    status: "ACTIVE"
                });

                const secondAccount = new accountModel({
                    user: user._id,
                    currency: "INR",
                    status: "ACTIVE"
                });

                await firstAccount.save({ session });
                await secondAccount.save({ session });

                return [firstAccount, secondAccount];
            }

            async function ensureTransfer({
                fromAccount,
                toAccount,
                initiatedBy,
                amount,
                idempotencyKey
            }) {
                const existing = await transactionModel
                    .findOne({ initiatedBy, idempotencyKey })
                    .session(session);

                if (existing) {
                    const matches =
                        existing.fromAccount.toString() === fromAccount.toString() &&
                        existing.toAccount.toString() === toAccount.toString() &&
                        existing.amount === amount &&
                        existing.status === "COMPLETED";

                    if (!matches) {
                        throw new Error(
                            `Existing seed transaction does not match: ${idempotencyKey}`
                        );
                    }

                    const entries = await ledgerModel
                        .find({ transaction: existing._id })
                        .session(session);

                    const validEntries =
                        entries.length === 2 &&
                        entries.some(entry =>
                            entry.account.toString() === fromAccount.toString() &&
                            entry.type === "DEBIT" &&
                            entry.amount === amount
                        ) &&
                        entries.some(entry =>
                            entry.account.toString() === toAccount.toString() &&
                            entry.type === "CREDIT" &&
                            entry.amount === amount
                        );

                    if (!validEntries) {
                        throw new Error(
                            `Ledger verification failed: ${idempotencyKey}`
                        );
                    }

                    return;
                }

                const transaction = new transactionModel({
                    fromAccount,
                    toAccount,
                    initiatedBy,
                    amount,
                    idempotencyKey,
                    status: "PENDING"
                });

                await transaction.save({ session });

                await ledgerModel.create(
                    [
                        {
                            account: fromAccount,
                            amount,
                            transaction: transaction._id,
                            type: "DEBIT"
                        },
                        {
                            account: toAccount,
                            amount,
                            transaction: transaction._id,
                            type: "CREDIT"
                        }
                    ],
                    {
                        session,
                        ordered: true
                    }
                );

                transaction.status = "COMPLETED";
                await transaction.save({ session });
            }

            const testUser = await getOrCreateUser({
                email: testEmail,
                name: "Backend Ledger Test User",
                password: testPassword
            });

            const systemUser = await getOrCreateUser({
                email: "ledger-system@example.invalid",
                name: "Backend Ledger Development System",
                password: crypto.randomBytes(32).toString("hex"),
                systemUser: true
            });

            const testAccounts = await getOrCreateAccounts(testUser);
            const systemAccounts = await getOrCreateAccounts(systemUser);

            const [testAccountA, testAccountB] = testAccounts;
            const [clearingAccount, treasuryAccount] = systemAccounts;

            await ensureTransfer({
                fromAccount: clearingAccount._id,
                toAccount: treasuryAccount._id,
                initiatedBy: systemUser._id,
                amount: 20000,
                idempotencyKey: "DEV-SEED-CAPITAL-V1"
            });

            await ensureTransfer({
                fromAccount: treasuryAccount._id,
                toAccount: testAccountA._id,
                initiatedBy: systemUser._id,
                amount: 10000,
                idempotencyKey: "DEV-SEED-ACCOUNT-A-V1"
            });

            await ensureTransfer({
                fromAccount: treasuryAccount._id,
                toAccount: testAccountB._id,
                initiatedBy: systemUser._id,
                amount: 10000,
                idempotencyKey: "DEV-SEED-ACCOUNT-B-V1"
            });

            result = {
                testEmail: testUser.email,
                accountA: testAccountA._id.toString(),
                accountB: testAccountB._id.toString(),
                clearingAccount: clearingAccount._id.toString(),
                treasuryAccount: treasuryAccount._id.toString()
            };
        }, {
            readPreference: "primary",
            readConcern: { level: "snapshot" },
            writeConcern: { w: "majority" }
        });

        console.log("\nDevelopment seed completed successfully.");
        console.log("Test user:", result.testEmail);
        console.log("Test account A:", result.accountA);
        console.log("Test account B:", result.accountB);
        console.log("System clearing account:", result.clearingAccount);
        console.log("System treasury account:", result.treasuryAccount);
        console.log("Initial test balance: INR 10,000 per test account.");
        console.log("Existing real user accounts were not selected or modified.");

    } finally {
        if (session) {
            await session.endSession();
        }

        await mongoose.disconnect();
    }
}

main().catch(error => {
    console.error("Development seed failed:", error.message);
    process.exitCode = 1;
});
