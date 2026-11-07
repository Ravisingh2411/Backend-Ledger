
const path = require("path");
require("dotenv").config({
    path: path.resolve(__dirname, "../.env")
});

const mongoose = require("mongoose");

async function main() {
    if (process.env.NODE_ENV !== "development") {
        throw new Error("Admin seeding is allowed only in development mode.");
    }

    if (process.env.ALLOW_ADMIN_SEED !== "true") {
        throw new Error("Admin seeding is not enabled.");
    }

    const email = process.env.ADMIN_SEED_EMAIL?.trim().toLowerCase();
    const name = process.env.ADMIN_SEED_NAME?.trim();
    const password = process.env.ADMIN_SEED_PASSWORD;

    if (
        !email ||
        !email.endsWith(".invalid") ||
        !name ||
        name.length < 2 ||
        !password ||
        password.length < 16
    ) {
        throw new Error(
            "Configure an admin .invalid email, a name, and a password of at least 16 characters."
        );
    }

    if (!process.env.MONGO_URI) {
        throw new Error("Database configuration is missing.");
    }

    const userModel = require("../src/models/user.model");

    let connected = false;

    try {
        await mongoose.connect(process.env.MONGO_URI);
        connected = true;

        console.log("Connected to database.");

        const existingUser = await userModel
            .findOne({ email })
            .select("+systemUser");

        if (existingUser) {
            if (existingUser.systemUser) {
                throw new Error(
                    "This email belongs to an internal system user. Use a separate admin identity."
                );
            }

            if (existingUser.role === "admin") {
                console.log("Admin account is already provisioned.");
                console.log("Admin email:", existingUser.email);
                return;
            }

            throw new Error(
                "A normal user already exists with this email. Admin seeding will not promote an existing account."
            );
        }

        const admin = new userModel({
            name,
            email,
            password,
            role: "admin",
            systemUser: false
        });

        await admin.save();

        console.log("\nAdmin account created successfully.");
        console.log("Admin email:", admin.email);
        console.log("Role:", admin.role);
        console.log("Password was not displayed.");
    } finally {
        if (connected) {
            await mongoose.disconnect();
        }
    }
}

main().catch(error => {
    console.error("Admin seeding failed:", error.message);
    process.exitCode = 1;
});
