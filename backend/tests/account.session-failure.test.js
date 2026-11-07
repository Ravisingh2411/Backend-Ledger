
const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');

jest.mock('../src/models/account.model', () => ({
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn()
}));

const {
    freezeAccountController
} = require('../src/controllers/account.controller');

const USER_ID = '507f1f77bcf86cd799439011';
const ACCOUNT_ID = '507f191e810c19729de860ea';

describe('Account Session Failure Tests', () => {
    let app;

    beforeEach(() => {
        app = express();

        app.use((req, res, next) => {
            req.user = { _id: USER_ID };
            next();
        });

        app.patch(
            '/accounts/:accountId/freeze',
            freezeAccountController
        );

        jest.spyOn(console, 'error')
            .mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('should handle session creation failure safely', async () => {
        jest.spyOn(mongoose, 'startSession')
            .mockRejectedValue(new Error('Session creation failed'));

        const response = await request(app)
            .patch(`/accounts/${ACCOUNT_ID}/freeze`);

        expect(response.statusCode).toBe(500);

        expect(response.body.message).toBe(
            'Unable to update account. Please try again later.'
        );

        expect(mongoose.startSession).toHaveBeenCalledTimes(1);
    });
});
