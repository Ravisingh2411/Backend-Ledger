const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');
const { rateLimit } = require('express-rate-limit');

const errorHandler = require('./middlewares/error.middleware');

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
    windowMs: 5 * 60 * 1000,
    limit: 5,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
        message: 'Too many failed authentication attempts. Please try again after 5 minutes.'
    }
});

const authRouter = require('./routes/auth.routes');
const accountRouter = require('./routes/account.routes');
const transactionRoutes = require('./routes/transaction.routes');
const adminRouter = require('./routes/admin.routes');

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
app.use('/api/admin', adminRouter);

app.use((req, res) => {
    res.status(404).json({
        message: 'Route not found'
    });
});

app.use(errorHandler);

module.exports = app;