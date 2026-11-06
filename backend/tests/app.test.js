const request = require('supertest');
const app = require('../src/app');

describe('Backend API Tests', () => {
    describe('GET /', () => {
        test('should return service status', async () => {
            const response = await request(app)
                .get('/');

            expect(response.statusCode).toBe(200);
            expect(response.body).toEqual({
                message: 'Ledger service is running',
                status: 'OK'
            });
        });
    });

    describe('404 Handler', () => {
        test('should return 404 for unknown routes', async () => {
            const response = await request(app)
                .get('/unknown-route');

            expect(response.statusCode).toBe(404);
            expect(response.body.message).toBe('Route not found');
        });
    });

    describe('Registration Validation', () => {
        test('should reject invalid registration details', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    name: '',
                    email: 'invalid-email',
                    password: '123'
                });

            expect(response.statusCode).toBe(400);
            expect(response.body.message).toBe(
                'Invalid registration details'
            );
            expect(response.body.errors).toBeDefined();
        });
    });

    describe('Login Validation', () => {
        test('should reject invalid login details', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'invalid-email',
                    password: ''
                });

            expect(response.statusCode).toBe(400);
            expect(response.body.message).toBe(
                'Invalid login details'
            );
            expect(response.body.errors).toBeDefined();
        });
    });

    describe('JSON Parsing', () => {
        test('should reject malformed JSON', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .set('Content-Type', 'application/json')
                .send('{"email":');

            expect(response.statusCode).toBe(400);
            expect(response.body.message).toBe(
                'Invalid JSON request body'
            );
        });
    });
});