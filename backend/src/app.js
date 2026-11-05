
const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');
const { rateLimit } = require('express-rate-limit');

const app = express();

if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

const allowedOrigins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

if (process.env.NODE_ENV !== 'production') {
    allowedOrigins.push('http://localhost:5173');
}

app.use(helmet());

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(null, false);
    },
    credentials: true
}));

app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
        message: 'Too many requests. Please try again later.'
    }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
        message: 'Too many authentication attempts. Please try again later.'
    }
});

const authRouter = require('./routes/auth.routes');
const accountRouter = require('./routes/account.routes');
const transactionRoutes = require('./routes/transaction.routes');

app.get('/', (req, res) => {
    res.status(200).json({
        message: 'Ledger service is running',
        status: 'OK'
    });
});

app.use('/api', apiLimiter);

app.use('/api/auth', authLimiter, authRouter);
app.use('/api/accounts', accountRouter);
app.use('/api/transactions', transactionRoutes);

app.use((req, res) => {
    res.status(404).json({
        message: 'Route not found'
    });
});

app.use((err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    console.error('Request error:', err);

    let statusCode = err.statusCode || err.status || 500;
    let message = 'Internal server error';

    if (err.type === 'entity.parse.failed') {
        statusCode = 400;
        message = 'Invalid JSON request body';
    } else if (err.name === 'ValidationError' || err.name === 'CastError') {
        statusCode = 400;
        message = 'Invalid request data';
    } else if (err.code === 11000) {
        statusCode = 409;
        message = 'A record with this value already exists';
    } else if (statusCode < 500) {
        message = err.message;
    }

    res.status(statusCode).json({ message });
});

module.exports = app;
