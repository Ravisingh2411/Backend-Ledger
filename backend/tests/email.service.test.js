
const mockVerify = jest.fn();
const mockSendMail = jest.fn();

jest.mock('nodemailer', () => ({
    createTransport: jest.fn(() => ({
        verify: mockVerify,
        sendMail: mockSendMail,
    })),
}));

describe('Email Service Tests', () => {
    let emailService;
    let nodemailer;

    const originalEnv = {
        EMAIL_USER: process.env.EMAIL_USER,
        CLIENT_ID: process.env.CLIENT_ID,
        CLIENT_SECRET: process.env.CLIENT_SECRET,
        REFRESH_TOKEN: process.env.REFRESH_TOKEN,
    };

    beforeEach(() => {
        process.env.EMAIL_USER = 'test@example.com';
        process.env.CLIENT_ID = 'test-client-id';
        process.env.CLIENT_SECRET = 'test-client-secret';
        process.env.REFRESH_TOKEN = 'test-refresh-token';

        jest.resetModules();
        jest.clearAllMocks();

        mockVerify.mockResolvedValue(true);
        mockSendMail.mockResolvedValue({
            messageId: 'test-message-id',
        });

        nodemailer = require('nodemailer');
        emailService = require('../src/services/email.service');

        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    afterAll(() => {
        Object.entries(originalEnv).forEach(([key, value]) => {
            if (value === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = value;
            }
        });
    });

    describe('Transporter Configuration', () => {
        test('should create Gmail transporter with OAuth2 configuration', () => {
            expect(nodemailer.createTransport).toHaveBeenCalledWith({
                service: 'gmail',
                auth: {
                    type: 'OAuth2',
                    user: 'test@example.com',
                    clientId: 'test-client-id',
                    clientSecret: 'test-client-secret',
                    refreshToken: 'test-refresh-token',
                },
            });
        });
    });

    describe('verifyEmailConnection', () => {
        test('should return true when email connection is successful', async () => {
            mockVerify.mockResolvedValue(true);

            const result = await emailService.verifyEmailConnection();

            expect(result).toBe(true);
            expect(mockVerify).toHaveBeenCalledTimes(1);
            expect(console.log).toHaveBeenCalledWith(
                'Email server is ready to send messages'
            );
        });

        test('should return false when email connection fails', async () => {
            mockVerify.mockRejectedValue(
                new Error('Connection failed')
            );

            const result = await emailService.verifyEmailConnection();

            expect(result).toBe(false);
            expect(console.error).toHaveBeenCalledWith(
                'Error connecting to email server:',
                'Connection failed'
            );
        });
    });

    describe('sendRegistrationEmail', () => {
        test('should send registration welcome email', async () => {
            await emailService.sendRegistrationEmail(
                'user@example.com',
                'Ravi'
            );

            expect(mockSendMail).toHaveBeenCalledTimes(1);

            const email = mockSendMail.mock.calls[0][0];

            expect(email.from).toBe(
                '"Backend Ledger" <test@example.com>'
            );
            expect(email.to).toBe('user@example.com');
            expect(email.subject).toBe(
                'Welcome to Backend Ledger'
            );
            expect(email.text).toContain('Hello Ravi');
            expect(email.html).toContain('Ravi');
            expect(email.html).toContain(
                'Your account has been successfully created.'
            );
        });
    });

    describe('sendTransactionEmail', () => {
        test('should send successful transaction email', async () => {
            await emailService.sendTransactionEmail(
                'user@example.com',
                'Ravi',
                500,
                'ACC123'
            );

            expect(mockSendMail).toHaveBeenCalledTimes(1);

            const email = mockSendMail.mock.calls[0][0];

            expect(email.to).toBe('user@example.com');
            expect(email.subject).toBe('Transaction Successful!');
            expect(email.text).toContain('Hello Ravi');
            expect(email.text).toContain('500');
            expect(email.text).toContain('ACC123');
            expect(email.html).toContain('500');
        });
    });

    describe('sendTransactionFailureEmail', () => {
        test('should send failed transaction email', async () => {
            await emailService.sendTransactionFailureEmail(
                'user@example.com',
                'Ravi',
                500,
                'ACC123'
            );

            expect(mockSendMail).toHaveBeenCalledTimes(1);

            const email = mockSendMail.mock.calls[0][0];

            expect(email.to).toBe('user@example.com');
            expect(email.subject).toBe('Transaction Failed');
            expect(email.text).toContain('Hello Ravi');
            expect(email.text).toContain('500');
            expect(email.text).toContain('ACC123');
            expect(email.text).toContain('has failed');
        });
    });

    describe('sendMoneyReceivedEmail', () => {
        test('should send money received notification', async () => {
            await emailService.sendMoneyReceivedEmail(
                'receiver@example.com',
                'Ravi',
                1000,
                'ACC456'
            );

            expect(mockSendMail).toHaveBeenCalledTimes(1);

            const email = mockSendMail.mock.calls[0][0];

            expect(email.to).toBe('receiver@example.com');
            expect(email.subject).toBe(
                'Money Credited to Your Account!'
            );
            expect(email.text).toContain('Hello Ravi');
            expect(email.text).toContain('1000');
            expect(email.text).toContain('ACC456');
            expect(email.html).toContain('<strong>1000</strong>');
        });
    });

    describe('Email Sending Failure', () => {
        test('should handle email sending failure without throwing', async () => {
            mockSendMail.mockRejectedValue(
                new Error('SMTP authentication failed')
            );

            await expect(
                emailService.sendRegistrationEmail(
                    'user@example.com',
                    'Ravi'
                )
            ).resolves.toBeUndefined();

            expect(mockSendMail).toHaveBeenCalledTimes(1);

            expect(console.error).toHaveBeenCalledWith(
                'Error sending email:',
                'SMTP authentication failed'
            );
        });
    });
});
