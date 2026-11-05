
const userModel = require('../models/user.model');
const jwt = require('jsonwebtoken');
const tokenBlackListModel = require('../models/blackList.model');

function getToken(req) {
    const cookieToken = req.cookies?.token;

    if (cookieToken) {
        return cookieToken;
    }

    const authHeader = req.get('authorization');

    if (!authHeader) {
        return null;
    }

    const parts = authHeader.trim().split(/\s+/);

    if (
        parts.length !== 2 ||
        parts[0].toLowerCase() !== 'bearer' ||
        !parts[1]
    ) {
        return null;
    }

    return parts[1];
}

async function authenticate(req, res, next, requireSystemUser = false) {
    const token = getToken(req);

    if (!token) {
        return res.status(401).json({
            message: 'Unauthorized access, token is missing or malformed'
        });
    }

    let decoded;

    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET, {
            algorithms: ['HS256']
        });
    } catch (error) {
        return res.status(401).json({
            message: 'Unauthorized access, token is invalid or expired'
        });
    }

    if (!decoded || typeof decoded.userId !== 'string') {
        return res.status(401).json({
            message: 'Unauthorized access, invalid token payload'
        });
    }

    const isBlacklisted = await tokenBlackListModel.exists({ token });

    if (isBlacklisted) {
        return res.status(401).json({
            message: 'Unauthorized access, token has been revoked'
        });
    }

    const userQuery = userModel.findById(decoded.userId);

    if (requireSystemUser) {
        userQuery.select('+systemUser');
    }

    const user = await userQuery;

    if (!user) {
        return res.status(401).json({
            message: 'Unauthorized access, user no longer exists'
        });
    }

    if (requireSystemUser && !user.systemUser) {
        return res.status(403).json({
            message: 'Forbidden access, not a system user'
        });
    }

    req.user = user;

    return next();
}

function authMiddleware(req, res, next) {
    return authenticate(req, res, next);
}

function authSystemUserMiddleware(req, res, next) {
    return authenticate(req, res, next, true);
}

module.exports = {
    authMiddleware,
    authSystemUserMiddleware
};
