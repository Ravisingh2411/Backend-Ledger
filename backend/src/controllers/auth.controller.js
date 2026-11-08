
const { z } = require('zod');
const jwt = require('jsonwebtoken');

const userModel = require('../models/user.model');
const emailService = require('../services/email.service');
const tokenBlackListModel = require('../models/blackList.model');

const TOKEN_EXPIRY = '3d';
const TOKEN_MAX_AGE = 3 * 24 * 60 * 60 * 1000;
const LOGIN_QUERY_TIMEOUT_MS = 10000;

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
    maxAge: TOKEN_MAX_AGE
};

const clearCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/'
};

const registerSchema = z.object({
    name: z.string().trim().min(1).max(100),
    email: z.string().trim().email().max(254),
    password: z.string().min(6).max(128)
});

const loginSchema = z.object({
    email: z.string().trim().email().max(254),
    password: z.string().min(1).max(128)
});

function createToken(userId) {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not configured');
    }

    return jwt.sign(
        { userId: userId.toString() },
        process.env.JWT_SECRET,
        {
            expiresIn: TOKEN_EXPIRY,
            algorithm: 'HS256'
        }
    );
}

function getToken(req) {
    const cookieToken = req.cookies?.token;

    if (cookieToken) {
        return cookieToken;
    }

    const authHeader = req.get('authorization');

    if (!authHeader) {
        return null;
    }

    const parts = authHeader.trim().split(/\\s+/);

    if (
        parts.length !== 2 ||
        parts[0].toLowerCase() !== 'bearer' ||
        !parts[1]
    ) {
        return null;
    }

    return parts[1];
}

function getPublicUser(user) {
    return {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || 'user'
    };
}

async function userRegisterController(req, res) {
    const validation = registerSchema.safeParse(req.body);

    if (!validation.success) {
        return res.status(400).json({
            message: 'Invalid registration details',
            errors: validation.error.issues.map(issue => ({
                field: issue.path.join('.'),
                message: issue.message
            }))
        });
    }

    const { name, email, password } = validation.data;

    const existingUser = await userModel.findOne({ email });

    if (existingUser) {
        return res.status(409).json({
            message: 'User already exists with this email',
            status: 'failed'
        });
    }

    // Public registration always creates a normal user.
    const user = await userModel.create({
        name,
        email,
        password
    });

    const token = createToken(user._id);

    res.cookie('token', token, cookieOptions);

    res.status(201).json({
        user: getPublicUser(user),
        token
    });

    try {
        await emailService.sendRegistrationEmail(user.email, user.name);
    } catch (error) {
        console.error('Registration email failed:', error.message);
    }
}

async function userLoginController(req, res) {
    const requestStartedAt = Date.now();
    let stage = 'validation';

    console.info('[AUTH LOGIN] Controller started');

    try {
        const validation = loginSchema.safeParse(req.body);

        if (!validation.success) {
            console.warn('[AUTH LOGIN] Request validation failed');
            return res.status(400).json({
                message: 'Invalid login details',
                errors: validation.error.issues.map(issue => ({
                    field: issue.path.join('.'),
                    message: issue.message
                }))
            });
        }

        const { email, password } = validation.data;

        stage = 'database-user-lookup';
        console.info('[AUTH LOGIN] Starting database user lookup');

        const user = await userModel
            .findOne({ email })
            .select('+password')
            .maxTimeMS(LOGIN_QUERY_TIMEOUT_MS)
            .exec();

        console.info(
            `[AUTH LOGIN] Database user lookup completed in ${Date.now() - requestStartedAt}ms`
        );

        if (!user) {
            console.warn('[AUTH LOGIN] User lookup completed: no matching user');
            return res.status(401).json({
                message: 'Email or password is invalid'
            });
        }

        stage = 'password-comparison';
        console.info('[AUTH LOGIN] Starting password comparison');

        const isValidPassword = await user.comparePassword(password);

        console.info(
            `[AUTH LOGIN] Password comparison completed in ${Date.now() - requestStartedAt}ms`
        );

        if (!isValidPassword) {
            console.warn('[AUTH LOGIN] Password comparison failed');
            return res.status(401).json({
                message: 'Email or password is invalid'
            });
        }

        stage = 'token-generation';
        const token = createToken(user._id);

        res.cookie('token', token, cookieOptions);

        console.info(
            `[AUTH LOGIN] Login successful; sending response after ${Date.now() - requestStartedAt}ms`
        );

        return res.status(200).json({
            user: getPublicUser(user),
            token
        });
    } catch (error) {
        console.error(
            `[AUTH LOGIN] Failed during stage "${stage}" after ${Date.now() - requestStartedAt}ms:`,
            error
        );
        throw error;
    }
}

async function userLogoutController(req, res) {
    const token = getToken(req);

    if (token) {
        try {
            await tokenBlackListModel.create({ token });
        } catch (error) {
            if (error.code !== 11000) {
                throw error;
            }
        }
    }

    res.clearCookie('token', clearCookieOptions);

    return res.status(200).json({
        message: 'User logged out successfully'
    });
}

module.exports = {
    userRegisterController,
    userLoginController,
    userLogoutController
};
