const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const transactionController = require('../controllers/transaction.controller');

const transactionRoutes = express.Router();

/* POST /api/transactions/ */
transactionRoutes.post('/', authMiddleware.authMiddleware, transactionController.createTransaction);

/* POST /api/transactions/system/initial-funds */
transactionRoutes.post("/system/initial-funds", authMiddleware.authSystemUserMiddleware, transactionController.createInitialFundsTransaction);

module.exports = transactionRoutes