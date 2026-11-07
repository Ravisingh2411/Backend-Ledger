
const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

jest.mock('../src/models/user.model', () => ({
    findOne: jest.fn(),
    create: jest.fn()
}));

jest.mock('../src/models/blackList.model', () => ({
    create: jest.fn()
}));

jest.mock('../src/services/email.service', () => ({
    sendRegistrationEmail: jest.fn()
}));

const userModel = require('../src/models/user.model');
const tokenBlackListModel = require('../src/models/blackList.model');
const emailService = require('../src/services/email.service');

const {
    userRegisterController,
    userLoginController,
    userLogoutController
} = require('../src/controllers/auth.controller');

const JWT_SECRET = 'test-secret-for-auth-controller';

const mockUser = {
    _id: 'user123',
    name: 'Test User',
    email: 'test@example.com',
    password: 'hashed-password',
    comparePassword: jest.fn()
};

function createUserQuery(user) {
    return {
        select: jest.fn().mockResolvedValue(user),
        then: (resolve, reject) =>
            Promise.resolve(user).then(resolve, reject)
    };
}

function createApp(controller, method = 'post') {
    const app = express();

    app.use(express.json());
    app.use(cookieParser());

    app[method]('/auth', async (req, res, next) => {
        try {
            await controller(req, res);
        } catch (error) {
            next(error);
        }
    });

    app.use((error, req, res, next) => {
        res.status(500).json({
            message: 'Internal server error'
        });
    });

    return app;
}

function createValidToken() {
    return jwt.sign(
        { userId: 'user123' },
        JWT_SECRET,
        {
            algorithm: 'HS256',
            expiresIn: '3d'
        }
    );
}

describe('Auth Controller Tests', () => {
    const registerApp = createApp(userRegisterController);
    const loginApp = createApp(userLoginController);
    const logoutApp = createApp(userLogoutController);

    beforeAll(() => {
        process.env.JWT_SECRET = JWT_SECRET;
    });

    beforeEach(() => {
        jest.clearAllMocks();

        userModel.findOne.mockImplementation(() =>
            createUserQuery(null)
        );

        userModel.create.mockResolvedValue(mockUser);

        mockUser.comparePassword.mockResolvedValue(true);

        emailService.sendRegistrationEmail.mockResolvedValue(true);

        tokenBlackListModel.create.mockResolvedValue({
            token: 'test-token'
        });
    });

    describe('Registration', () => {
        test('should reject registration with invalid details', async () => {
            const response = await request(registerApp)
                .post('/auth')
                .send({
                    name: '',
                    email: 'invalid-email',
                    password: '123'
                });

            expect(response.statusCode).toBe(400);
            expect(response.body.message).toBe(
                'Invalid registration details'
            );

            expect(userModel.findOne).not.toHaveBeenCalled();
            expect(userModel.create).not.toHaveBeenCalled();
        });

        test('should reject registration with missing fields', async () => {
            const response = await request(registerApp)
                .post('/auth')
                .send({});

            expect(response.statusCode).toBe(400);
            expect(response.body.errors.length).toBeGreaterThan(0);
        });

        test('should trim name and email before registration', async () => {
            const response = await request(registerApp)
                .post('/auth')
                .send({
                    name: '  Test User  ',
                    email: '  test@example.com  ',
                    password: 'password123'
                });

            expect(response.statusCode).toBe(201);

            expect(userModel.findOne).toHaveBeenCalledWith({
                email: 'test@example.com'
            });

            expect(userModel.create).toHaveBeenCalledWith({
                name: 'Test User',
                email: 'test@example.com',
                password: 'password123'
            });
        });

        test('should reject registration when user already exists', async () => {
            userModel.findOne.mockImplementation(() =>
                createUserQuery(mockUser)
            );

            const response = await request(registerApp)
                .post('/auth')
                .send({
                    name: 'Test User',
                    email: 'test@example.com',
                    password: 'password123'
                });

            expect(response.statusCode).toBe(409);
            expect(response.body.status).toBe('failed');

            expect(userModel.create).not.toHaveBeenCalled();
        });

        test('should register user successfully', async () => {
            const response = await request(registerApp)
                .post('/auth')
                .send({
                    name: 'Test User',
                    email: 'test@example.com',
                    password: 'password123'
                });

            expect(response.statusCode).toBe(201);

            expect(response.body.user).toEqual({
                _id: 'user123',
                name: 'Test User',
                email: 'test@example.com',
                role: 'user'
            });

            expect(response.body.token).toBeDefined();

            const decodedToken = jwt.verify(
                response.body.token,
                JWT_SECRET
            );

            expect(decodedToken.userId).toBe('user123');

            expect(response.headers['set-cookie']).toBeDefined();
            expect(response.headers['set-cookie'][0]).toMatch(
                /HttpOnly/i
            );

            expect(userModel.create).toHaveBeenCalledTimes(1);
            expect(emailService.sendRegistrationEmail)
                .toHaveBeenCalledWith(
                    'test@example.com',
                    'Test User'
                );

            expect(response.body.user.password).toBeUndefined();
        });

        test('should return server error when user lookup fails', async () => {
            userModel.findOne.mockImplementation(() => ({
                then: (resolve, reject) =>
                    Promise.reject(
                        new Error('Database failure')
                    ).then(resolve, reject)
            }));

            const response = await request(registerApp)
                .post('/auth')
                .send({
                    name: 'Test User',
                    email: 'test@example.com',
                    password: 'password123'
                });

            expect(response.statusCode).toBe(500);
        });

        test('should return server error when user creation fails', async () => {
            userModel.create.mockRejectedValue(
                new Error('User creation failed')
            );

            const response = await request(registerApp)
                .post('/auth')
                .send({
                    name: 'Test User',
                    email: 'test@example.com',
                    password: 'password123'
                });

            expect(response.statusCode).toBe(500);
        });

        test('should not fail registration when registration email fails', async () => {
            const consoleSpy = jest
                .spyOn(console, 'error')
                .mockImplementation(() => {});

            emailService.sendRegistrationEmail.mockRejectedValue(
                new Error('Email service unavailable')
            );

            const response = await request(registerApp)
                .post('/auth')
                .send({
                    name: 'Test User',
                    email: 'test@example.com',
                    password: 'password123'
                });

            expect(response.statusCode).toBe(201);
            expect(response.body.token).toBeDefined();

            expect(consoleSpy).toHaveBeenCalled();

            consoleSpy.mockRestore();
        });

        test('should return server error when JWT secret is missing', async () => {
            const originalSecret = process.env.JWT_SECRET;

            delete process.env.JWT_SECRET;

            const response = await request(registerApp)
                .post('/auth')
                .send({
                    name: 'Test User',
                    email: 'test@example.com',
                    password: 'password123'
                });

            expect(response.statusCode).toBe(500);

            process.env.JWT_SECRET = originalSecret;
        });
    });

    describe('Login', () => {
        test('should reject login with invalid details', async () => {
            const response = await request(loginApp)
                .post('/auth')
                .send({
                    email: 'invalid-email',
                    password: ''
                });

            expect(response.statusCode).toBe(400);
            expect(response.body.message).toBe(
                'Invalid login details'
            );

            expect(userModel.findOne).not.toHaveBeenCalled();
        });

        test('should reject login when user does not exist', async () => {
            const response = await request(loginApp)
                .post('/auth')
                .send({
                    email: 'unknown@example.com',
                    password: 'password123'
                });

            expect(response.statusCode).toBe(401);
            expect(response.body.message).toBe(
                'Email or password is invalid'
            );
        });

        test('should select password field during user lookup', async () => {
            userModel.findOne.mockImplementation(() =>
                createUserQuery(mockUser)
            );

            await request(loginApp)
                .post('/auth')
                .send({
                    email: 'test@example.com',
                    password: 'password123'
                });

            expect(
                userModel.findOne.mock.results[0].value.select
            ).toHaveBeenCalledWith('+password');
        });

        test('should reject login with incorrect password', async () => {
            userModel.findOne.mockImplementation(() =>
                createUserQuery(mockUser)
            );

            mockUser.comparePassword.mockResolvedValue(false);

            const response = await request(loginApp)
                .post('/auth')
                .send({
                    email: 'test@example.com',
                    password: 'wrong-password'
                });

            expect(response.statusCode).toBe(401);
            expect(response.body.message).toBe(
                'Email or password is invalid'
            );
        });

        test('should login successfully with correct password', async () => {
            userModel.findOne.mockImplementation(() =>
                createUserQuery(mockUser)
            );

            const response = await request(loginApp)
                .post('/auth')
                .send({
                    email: 'test@example.com',
                    password: 'password123'
                });

            expect(response.statusCode).toBe(200);

            expect(response.body.user).toEqual({
                _id: 'user123',
                name: 'Test User',
                email: 'test@example.com',
                role: 'user'
            });

            expect(response.body.token).toBeDefined();

            expect(mockUser.comparePassword)
                .toHaveBeenCalledWith('password123');

            expect(response.headers['set-cookie']).toBeDefined();

            expect(response.body.user.password).toBeUndefined();
        });

        test('should return server error when login database lookup fails', async () => {
            userModel.findOne.mockImplementation(() => ({
                select: jest.fn().mockRejectedValue(
                    new Error('Database failure')
                )
            }));

            const response = await request(loginApp)
                .post('/auth')
                .send({
                    email: 'test@example.com',
                    password: 'password123'
                });

            expect(response.statusCode).toBe(500);
        });
    });

    describe('Logout', () => {
        test('should blacklist token received through cookie', async () => {
            const token = createValidToken();

            const response = await request(logoutApp)
                .post('/auth')
                .set('Cookie', `token=${token}`);

            expect(response.statusCode).toBe(200);

            expect(tokenBlackListModel.create)
                .toHaveBeenCalledWith({ token });

            expect(response.body.message).toBe(
                'User logged out successfully'
            );

            expect(response.headers['set-cookie'][0]).toMatch(
                /Expires=Thu, 01 Jan 1970/i
            );
        });

        test('should blacklist token received through Bearer header', async () => {
            const token = createValidToken();

            const response = await request(logoutApp)
                .post('/auth')
                .set('Authorization', `Bearer ${token}`);

            expect(response.statusCode).toBe(200);

            expect(tokenBlackListModel.create)
                .toHaveBeenCalledWith({ token });
        });

        test('should logout successfully when token is missing', async () => {
            const response = await request(logoutApp)
                .post('/auth');

            expect(response.statusCode).toBe(200);

            expect(tokenBlackListModel.create)
                .not.toHaveBeenCalled();
        });

        test('should ignore invalid Authorization scheme', async () => {
            const response = await request(logoutApp)
                .post('/auth')
                .set('Authorization', 'Basic abc123');

            expect(response.statusCode).toBe(200);

            expect(tokenBlackListModel.create)
                .not.toHaveBeenCalled();
        });

        test('should ignore duplicate blacklist token error', async () => {
            const token = createValidToken();

            tokenBlackListModel.create.mockRejectedValue({
                code: 11000
            });

            const response = await request(logoutApp)
                .post('/auth')
                .set('Authorization', `Bearer ${token}`);

            expect(response.statusCode).toBe(200);
        });

        test('should return server error when blacklist database fails', async () => {
            const token = createValidToken();

            tokenBlackListModel.create.mockRejectedValue(
                new Error('Database failure')
            );

            const response = await request(logoutApp)
                .post('/auth')
                .set('Authorization', `Bearer ${token}`);

            expect(response.statusCode).toBe(500);
        });
    });
});
