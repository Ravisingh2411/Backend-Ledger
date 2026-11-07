
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const userModel = require('../src/models/user.model');

describe('User Model Tests', () => {
    afterAll(async () => {
        await mongoose.disconnect();
    });

    describe('Schema Defaults', () => {
        test('should set systemUser to false by default', () => {
            const user = new userModel({
                email: 'test@example.com',
                name: 'Test User',
                password: 'password123'
            });

            expect(user.systemUser).toBe(false);
        });

        test('should automatically create timestamps', () => {
            expect(userModel.schema.options.timestamps).toBe(true);
        });
    });

    describe('Schema Validation', () => {
        test('should create a valid user', async () => {
            const user = new userModel({
                email: 'test@example.com',
                name: 'Test User',
                password: 'password123'
            });

            await expect(user.validate()).resolves.toBeUndefined();
        });

        test('should reject user without email', async () => {
            const user = new userModel({
                name: 'Test User',
                password: 'password123'
            });

            await expect(user.validate()).rejects.toThrow();
        });

        test('should reject invalid email', async () => {
            const user = new userModel({
                email: 'invalid-email',
                name: 'Test User',
                password: 'password123'
            });

            await expect(user.validate()).rejects.toThrow();
        });

        test('should trim email whitespace', () => {
            const user = new userModel({
                email: '  test@example.com  ',
                name: 'Test User',
                password: 'password123'
            });

            expect(user.email).toBe('test@example.com');
        });

        test('should convert email to lowercase', () => {
            const user = new userModel({
                email: 'TEST@EXAMPLE.COM',
                name: 'Test User',
                password: 'password123'
            });

            expect(user.email).toBe('test@example.com');
        });

        test('should reject user without name', async () => {
            const user = new userModel({
                email: 'test@example.com',
                password: 'password123'
            });

            await expect(user.validate()).rejects.toThrow();
        });

        test('should reject user without password', async () => {
            const user = new userModel({
                email: 'test@example.com',
                name: 'Test User'
            });

            await expect(user.validate()).rejects.toThrow();
        });

        test('should reject password shorter than 6 characters', async () => {
            const user = new userModel({
                email: 'test@example.com',
                name: 'Test User',
                password: '12345'
            });

            await expect(user.validate()).rejects.toThrow();
        });
    });

    describe('Schema Configuration', () => {
        test('should hide password from normal queries', () => {
            expect(userModel.schema.path('password').options.select).toBe(false);
        });

        test('should hide systemUser from normal queries', () => {
            expect(userModel.schema.path('systemUser').options.select).toBe(false);
        });

        test('should make systemUser immutable', () => {
            expect(userModel.schema.path('systemUser').options.immutable).toBe(true);
        });

        test('should define unique email constraint', () => {
            expect(userModel.schema.path('email').options.unique).toEqual([
                true,
                'Email already exists'
            ]);
        });
    });

    describe('Password Hashing', () => {
        test('should hash password before saving', async () => {
            const user = new userModel({
                email: 'test@example.com',
                name: 'Test User',
                password: 'password123'
            });

            await user.validate();
            await userModel.schema.s.hooks.execPre('save', user);

            expect(user.password).not.toBe('password123');
            expect(await bcrypt.compare('password123', user.password)).toBe(true);
        });

        test('should not hash password again when password is not modified', async () => {
            const user = new userModel({
                email: 'test@example.com',
                name: 'Test User',
                password: 'password123'
            });

            await user.validate();
            await userModel.schema.s.hooks.execPre('save', user);

            const originalHash = user.password;

            user.isModified = jest.fn().mockReturnValue(false);

            await userModel.schema.s.hooks.execPre('save', user);

            expect(user.password).toBe(originalHash);
        });

        test('should hash a changed password', async () => {
            const user = new userModel({
                email: 'test@example.com',
                name: 'Test User',
                password: 'password123'
            });

            await user.validate();
            await userModel.schema.s.hooks.execPre('save', user);

            const originalHash = user.password;

            user.password = 'newpassword123';

            await userModel.schema.s.hooks.execPre('save', user);

            expect(user.password).not.toBe('newpassword123');
            expect(user.password).not.toBe(originalHash);
            expect(await bcrypt.compare('newpassword123', user.password)).toBe(true);
        });
    });

    describe('comparePassword', () => {
        test('should return true for correct password', async () => {
            const hashedPassword = await bcrypt.hash('password123', 10);

            const user = new userModel({
                email: 'test@example.com',
                name: 'Test User',
                password: hashedPassword
            });

            const result = await user.comparePassword('password123');

            expect(result).toBe(true);
        });

        test('should return false for incorrect password', async () => {
            const hashedPassword = await bcrypt.hash('password123', 10);

            const user = new userModel({
                email: 'test@example.com',
                name: 'Test User',
                password: hashedPassword
            });

            const result = await user.comparePassword('wrongpassword');

            expect(result).toBe(false);
        });
    });
});
