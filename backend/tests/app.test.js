
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

    describe('CORS Configuration', () => {
        test('should allow configured development origin', async () => {
            const response = await request(app)
                .get('/')
                .set('Origin', 'http://localhost:5173');

            expect(response.statusCode).toBe(200);
            expect(
                response.headers['access-control-allow-origin']
            ).toBe('http://localhost:5173');
        });

        test('should not allow an unknown origin', async () => {
            const response = await request(app)
                .get('/')
                .set('Origin', 'https://unknown.example.com');

            expect(response.statusCode).toBe(200);
            expect(
                response.headers['access-control-allow-origin']
            ).toBeUndefined();
        });
    });

    describe('Production Configuration', () => {
        test('should enable trust proxy and allow configured frontend origin', async () => {
            const previousNodeEnv = process.env.NODE_ENV;
            const previousFrontendUrl = process.env.FRONTEND_URL;

            let productionApp;

            try {
                process.env.NODE_ENV = 'production';
                process.env.FRONTEND_URL =
                    'https://frontend.example.com';

                jest.isolateModules(() => {
                    productionApp = require('../src/app');
                });
            } finally {
                if (previousNodeEnv === undefined) {
                    delete process.env.NODE_ENV;
                } else {
                    process.env.NODE_ENV = previousNodeEnv;
                }

                if (previousFrontendUrl === undefined) {
                    delete process.env.FRONTEND_URL;
                } else {
                    process.env.FRONTEND_URL = previousFrontendUrl;
                }
            }

            expect(productionApp.get('trust proxy')).toBe(1);

            const allowedResponse = await request(productionApp)
                .get('/')
                .set('Origin', 'https://frontend.example.com');

            expect(allowedResponse.statusCode).toBe(200);
            expect(
                allowedResponse.headers['access-control-allow-origin']
            ).toBe('https://frontend.example.com');

            const blockedResponse = await request(productionApp)
                .get('/')
                .set('Origin', 'https://untrusted.example.com');

            expect(blockedResponse.statusCode).toBe(200);
            expect(
                blockedResponse.headers['access-control-allow-origin']
            ).toBeUndefined();
        });
    });
});
