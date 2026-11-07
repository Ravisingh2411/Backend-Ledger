const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

jest.mock('../src/models/user.model', () => ({
    findById: jest.fn()
}));

jest.mock('../src/models/blackList.model', () => ({
    exists: jest.fn()
}));

const userModel = require('../src/models/user.model');
const tokenBlackListModel = require('../src/models/blackList.model');

const {
    authMiddleware,
    authSystemUserMiddleware,
    authAdminMiddleware
} = require('../src/middlewares/auth.middleware');

const errorHandler = require('../src/middlewares/error.middleware');

const JWT_SECRET = 'test-secret-for-auth-middleware';

function createUserQuery(user) {
    return {
        select: jest.fn().mockResolvedValue(user),
        then: (resolve, reject) =>
            Promise.resolve(user).then(resolve, reject)
    };
}

function createApp(middleware = authMiddleware) {
    const app = express();

    app.use(cookieParser());

    app.get('/protected', middleware, (req, res) => {
        res.status(200).json({
            message: 'Access granted',
            userId: req.user._id,
            systemUser: req.user.systemUser
        });
    });

    app.use(errorHandler);

    return app;
}

function createToken(payload = { userId: 'user123' }) {
    return jwt.sign(payload, JWT_SECRET, {
        algorithm: 'HS256',
        expiresIn: '1h'
    });
}

describe('Authentication Middleware Tests', () => {
    const app = createApp();

    const mockUser = {
        _id: 'user123',
        email: 'test@example.com',
        systemUser: false,
        role: 'user'
    };

    beforeAll(() => {
        process.env.JWT_SECRET = JWT_SECRET;
    });

    beforeEach(() => {
        jest.clearAllMocks();

        tokenBlackListModel.exists.mockResolvedValue(null);

        userModel.findById.mockImplementation(() =>
            createUserQuery(mockUser)
        );
    });

    test('should reject request when token is missing', async () => {
        const response = await request(app)
            .get('/protected');

        expect(response.statusCode).toBe(401);
        expect(response.body.message).toMatch(/token is missing/i);

        expect(userModel.findById).not.toHaveBeenCalled();
    });

    test('should reject malformed Bearer authorization header', async () => {
        const response = await request(app)
            .get('/protected')
            .set('Authorization', 'InvalidToken');

        expect(response.statusCode).toBe(401);
        expect(userModel.findById).not.toHaveBeenCalled();
    });

    test('should reject invalid JWT token', async () => {
        const response = await request(app)
            .get('/protected')
            .set('Authorization', 'Bearer invalid.token.value');

        expect(response.statusCode).toBe(401);
        expect(response.body.message).toMatch(/token is invalid/i);
    });

    test('should reject token with invalid payload', async () => {
        const token = createToken({});

        const response = await request(app)
            .get('/protected')
            .set('Authorization', `Bearer ${token}`);

        expect(response.statusCode).toBe(401);
        expect(response.body.message).toMatch(/invalid token payload/i);

        expect(userModel.findById).not.toHaveBeenCalled();
    });

    test('should reject blacklisted token', async () => {
        const token = createToken();

        tokenBlackListModel.exists.mockResolvedValue({
            _id: 'blacklisted-token'
        });

        const response = await request(app)
            .get('/protected')
            .set('Authorization', `Bearer ${token}`);

        expect(response.statusCode).toBe(401);
        expect(response.body.message).toMatch(/token has been revoked/i);

        expect(userModel.findById).not.toHaveBeenCalled();
    });

    test('should reject token when user no longer exists', async () => {
        const token = createToken();

        userModel.findById.mockImplementation(() =>
            createUserQuery(null)
        );

        const response = await request(app)
            .get('/protected')
            .set('Authorization', `Bearer ${token}`);

        expect(response.statusCode).toBe(401);
        expect(response.body.message).toMatch(/user no longer exists/i);
    });

    test('should allow authenticated user with valid Bearer token', async () => {
        const token = createToken();

        const response = await request(app)
            .get('/protected')
            .set('Authorization', `Bearer ${token}`);

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({
            message: 'Access granted',
            userId: 'user123',
            systemUser: false
        });

        expect(userModel.findById).toHaveBeenCalledWith('user123');
    });

    test('should allow authentication using cookie token', async () => {
        const token = createToken();

        const response = await request(app)
            .get('/protected')
            .set('Cookie', `token=${token}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.message).toBe('Access granted');
    });

    test('should reject normal user from system-user route', async () => {
        const token = createToken();

        const systemApp = createApp(authSystemUserMiddleware);

        const response = await request(systemApp)
            .get('/protected')
            .set('Authorization', `Bearer ${token}`);

        expect(response.statusCode).toBe(403);
        expect(response.body.message).toMatch(/not a system user/i);

        expect(
            userModel.findById.mock.results[0].value.select
        ).toHaveBeenCalledWith('+systemUser');
    });

    test('should allow system user on system-user route', async () => {
        const token = createToken();

        userModel.findById.mockImplementation(() =>
            createUserQuery({
                ...mockUser,
                systemUser: true
            })
        );

        const systemApp = createApp(authSystemUserMiddleware);

        const response = await request(systemApp)
            .get('/protected')
            .set('Authorization', `Bearer ${token}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.systemUser).toBe(true);
    });

    test('should reject expired JWT token', async () => {
        const token = jwt.sign(
            { userId: 'user123' },
            JWT_SECRET,
            {
                algorithm: 'HS256',
                expiresIn: -1
            }
        );

        const response = await request(app)
            .get('/protected')
            .set('Authorization', `Bearer ${token}`);

        expect(response.statusCode).toBe(401);
        expect(response.body.message).toMatch(/token is invalid or expired/i);

        expect(tokenBlackListModel.exists).not.toHaveBeenCalled();
        expect(userModel.findById).not.toHaveBeenCalled();
    });

    test('should reject JWT signed with an unsupported algorithm', async () => {
        const token = jwt.sign(
            { userId: 'user123' },
            JWT_SECRET,
            {
                algorithm: 'HS384',
                expiresIn: '1h'
            }
        );

        const response = await request(app)
            .get('/protected')
            .set('Authorization', `Bearer ${token}`);

        expect(response.statusCode).toBe(401);
        expect(response.body.message).toMatch(/token is invalid or expired/i);

        expect(tokenBlackListModel.exists).not.toHaveBeenCalled();
        expect(userModel.findById).not.toHaveBeenCalled();
    });

    test('should accept Bearer header with mixed case and extra spaces', async () => {
        const token = createToken();

        const response = await request(app)
            .get('/protected')
            .set('Authorization', `bEaReR    ${token}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.userId).toBe('user123');
    });

    test('should prioritize cookie token over Bearer token', async () => {
        const cookieToken = createToken({
            userId: 'cookieUser'
        });

        const bearerToken = createToken({
            userId: 'bearerUser'
        });

        userModel.findById.mockImplementation((userId) =>
            createUserQuery({
                ...mockUser,
                _id: userId
            })
        );

        const response = await request(app)
            .get('/protected')
            .set('Cookie', `token=${cookieToken}`)
            .set('Authorization', `Bearer ${bearerToken}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.userId).toBe('cookieUser');

        expect(userModel.findById).toHaveBeenCalledWith('cookieUser');
        expect(userModel.findById).not.toHaveBeenCalledWith('bearerUser');
    });

    test('should forward blacklist database errors to Express error handler', async () => {
        const token = createToken();

        tokenBlackListModel.exists.mockRejectedValue(
            new Error('Database connection failed')
        );

        const consoleErrorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation(() => {});

        try {
            const response = await request(app)
                .get('/protected')
                .set('Authorization', `Bearer ${token}`);

            expect(response.statusCode).toBe(500);
            expect(response.body).toEqual({
                message: 'Internal server error'
            });

            expect(userModel.findById).not.toHaveBeenCalled();
            expect(consoleErrorSpy).toHaveBeenCalled();
        } finally {
            consoleErrorSpy.mockRestore();
        }
    });
});

describe('Admin Authorization Middleware Tests', () => {
    const adminApp = createApp(authAdminMiddleware);

    beforeEach(() => {
        jest.clearAllMocks();

        tokenBlackListModel.exists.mockResolvedValue(null);

        userModel.findById.mockImplementation(() =>
            createUserQuery({
                _id: 'user123',
                email: 'test@example.com',
                systemUser: false,
                role: 'user'
            })
        );
    });

    test('should allow database admin user on admin route', async () => {
        const token = createToken();

        userModel.findById.mockImplementation(() =>
            createUserQuery({
                _id: 'user123',
                email: 'admin@example.com',
                systemUser: false,
                role: 'admin'
            })
        );

        const response = await request(adminApp)
            .get('/protected')
            .set('Authorization', `Bearer ${token}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.message).toBe('Access granted');
        expect(userModel.findById).toHaveBeenCalledWith('user123');
    });

    test('should reject normal database user from admin route with 403', async () => {
        const token = createToken();

        const response = await request(adminApp)
            .get('/protected')
            .set('Authorization', `Bearer ${token}`);

        expect(response.statusCode).toBe(403);
        expect(response.body.message).toMatch(/administrator privileges required/i);
    });

    test('should not trust admin role claim in JWT when database role is user', async () => {
        const token = createToken({
            userId: 'user123',
            role: 'admin'
        });

        userModel.findById.mockImplementation(() =>
            createUserQuery({
                _id: 'user123',
                email: 'test@example.com',
                systemUser: false,
                role: 'user'
            })
        );

        const response = await request(adminApp)
            .get('/protected')
            .set('Authorization', `Bearer ${token}`);

        expect(response.statusCode).toBe(403);
        expect(response.body.message).toMatch(/administrator privileges required/i);

        expect(userModel.findById).toHaveBeenCalledWith('user123');
    });

    test('should reject admin route request when authentication token is missing', async () => {
        const response = await request(adminApp)
            .get('/protected');

        expect(response.statusCode).toBe(401);
        expect(response.body.message).toMatch(/token is missing/i);

        expect(userModel.findById).not.toHaveBeenCalled();
    });

    test('should reject admin route request when JWT is invalid', async () => {
        const response = await request(adminApp)
            .get('/protected')
            .set('Authorization', 'Bearer invalid.token.value');

        expect(response.statusCode).toBe(401);
        expect(response.body.message).toMatch(/token is invalid/i);

        expect(userModel.findById).not.toHaveBeenCalled();
    });
});