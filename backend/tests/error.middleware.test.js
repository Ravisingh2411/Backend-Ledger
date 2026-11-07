const errorHandler = require('../src/middlewares/error.middleware');

describe('Error Middleware', () => {
    let req;
    let res;
    let next;
    let consoleErrorSpy;

    beforeEach(() => {
        req = {};

        res = {
            headersSent: false,
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };

        next = jest.fn();

        consoleErrorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation(() => {});
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    test('should pass error to next when headers are already sent', () => {
        const error = new Error('Headers already sent');

        res.headersSent = true;

        errorHandler(error, req, res, next);

        expect(next).toHaveBeenCalledWith(error);
        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).not.toHaveBeenCalled();
        expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    test('should return 500 for an unexpected error', () => {
        const error = new Error('Database failure');

        errorHandler(error, req, res, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            message: 'Internal server error'
        });
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Request error:',
            error
        );
    });

    test('should handle malformed JSON errors', () => {
        const error = new Error('Invalid JSON');
        error.type = 'entity.parse.failed';
        error.status = 400;

        errorHandler(error, req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            message: 'Invalid JSON request body'
        });
    });

    test('should handle Mongoose ValidationError', () => {
        const error = new Error('Validation failed');
        error.name = 'ValidationError';

        errorHandler(error, req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            message: 'Invalid request data'
        });
    });

    test('should handle Mongoose CastError', () => {
        const error = new Error('Cast failed');
        error.name = 'CastError';

        errorHandler(error, req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            message: 'Invalid request data'
        });
    });

    test('should handle MongoDB duplicate key errors', () => {
        const error = new Error('Duplicate key');
        error.code = 11000;

        errorHandler(error, req, res, next);

        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith({
            message: 'A record with this value already exists'
        });
    });

    test('should return the original message for client errors', () => {
        const error = new Error('Resource not found');
        error.statusCode = 404;

        errorHandler(error, req, res, next);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            message: 'Resource not found'
        });
    });

    test('should hide internal messages for server errors', () => {
        const error = new Error('Sensitive database details');
        error.statusCode = 503;

        errorHandler(error, req, res, next);

        expect(res.status).toHaveBeenCalledWith(503);
        expect(res.json).toHaveBeenCalledWith({
            message: 'Internal server error'
        });
    });

    test('should use status when statusCode is not available', () => {
        const error = new Error('Forbidden');
        error.status = 403;

        errorHandler(error, req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
            message: 'Forbidden'
        });
    });
});