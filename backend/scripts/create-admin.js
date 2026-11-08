
const path = require("path");
require("dotenv").config({
    path: path.resolve(__dirname, "../.env")
});

const mongoose = require("mongoose");
const User = require("../src/models/user.model");

async function main() {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const name = process.env.ADMIN_NAME?.trim();
    const password = process.env.ADMIN_PASSWORD;

    if (!process.env.MONGO_URI) {
        throw new Error("MONGO_URI is missing from backend/.env");
    }

    if (!email || !name || !password) {
        throw new Error("ADMIN_EMAIL, ADMIN_NAME and ADMIN_PASSWORD are required.");
    }

    if (password.length < 12) {
        throw new Error("Admin password must contain at least 12 characters.");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB.");

    try {
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            throw new Error(
                "This email already exists. No user was created or modified."
            );
        }

        const admin = new User({
            name,
            email,
            password,
            role: "admin",
            systemUser: false
        });

        await admin.save();

        console.log("\nAdmin created successfully.");
        console.log("Name:", admin.name);
        console.log("Email:", admin.email);
        console.log("Role:", admin.role);
        console.log("User ID:", admin._id.toString());
        console.log("No account or transaction was created.");
    } finally {
        await mongoose.disconnect();
    }
}

main().catch(error => {
    console.error("\nAdmin creation failed:", error.message);
    process.exitCode = 1;
});
