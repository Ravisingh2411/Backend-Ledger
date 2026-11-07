const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, "Email is required for creating a user"],
        trim: true,
        lowercase: true,
        match: [
            /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
            'Please fill a valid email address'
        ],
        unique: [true, "Email already exists"]
    },
    name: {
        type: String,
        required: [true, "Name is required for creating an account"]
    },
    password: {
        type: String,
        required: [true, "password is required for creating an account"],
        minlength: [6, "password should be atleast of 6 characters"],
        select: false
    },
    role: {
        type: String,
        enum: {
            values: ['user', 'admin'],
            message: 'Role must be either user or admin'
        },
        default: 'user'
    },
    systemUser: {
        type: Boolean,
        default: false,
        immutable: true,
        select: false
    }
}, {
    timestamps: true
});

// Hash password before saving a new or updated password.
userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;

    const hash = await bcrypt.hash(this.password, 10);
    this.password = hash;
});

userSchema.methods.comparePassword = async function (password) {
    return bcrypt.compare(password, this.password);
};

const userModel = mongoose.model("user", userSchema);

module.exports = userModel;