
const express = require("express");

const authMiddleware = require("../middlewares/auth.middleware");
const transactionController = require("../controllers/transaction.controller");
const transactionHistoryController = require("../controllers/transaction-history.controller");

const transactionRoutes = express.Router();

transactionRoutes.get(
    "/",
    authMiddleware.authMiddleware,
    transactionHistoryController.getUserTransactionsController
);

transactionRoutes.post(
    "/",
    authMiddleware.authMiddleware,
    transactionController.createTransaction
);

module.exports = transactionRoutes;
