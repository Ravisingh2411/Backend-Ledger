const errorHandler = (err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    console.error('Request error:', err);

    let statusCode = err.statusCode || err.status || 500;
    let message = 'Internal server error';

    if (err.type === 'entity.parse.failed') {
        statusCode = 400;
        message = 'Invalid JSON request body';
    } else if (
        err.name === 'ValidationError' ||
        err.name === 'CastError'
    ) {
        statusCode = 400;
        message = 'Invalid request data';
    } else if (err.code === 11000) {
        statusCode = 409;
        message = 'A record with this value already exists';
    } else if (statusCode < 500) {
        message = err.message;
    }

    return res.status(statusCode).json({ message });
};

module.exports = errorHandler;