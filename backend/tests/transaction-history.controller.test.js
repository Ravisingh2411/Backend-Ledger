
const express = require("express");
const request = require("supertest");

jest.mock("../src/models/account.model", () => ({
    find: jest.fn()
}));

jest.mock("../src/models/transaction.model", () => ({
    find: jest.fn()
}));

const accountModel = require("../src/models/account.model");
const transactionModel = require("../src/models/transaction.model");

const {
    getUserTransactionsController
} = require("../src/controllers/transaction-history.controller");

const app = express();

app.get("/api/transactions", (req, res) => {
    req.user = { _id: "user123" };
    getUserTransactionsController(req, res);
});

describe("Transaction History Controller", () => {
    let mockSelect;
    let mockQuery;

    const mockAccounts = [
        { _id: "account1" },
        { _id: "account2" }
    ];

    const mockTransactions = [
        { _id: "transaction1", amount: 500, status: "COMPLETED" },
        { _id: "transaction2", amount: 200, status: "COMPLETED" }
    ];

    beforeEach(() => {
        jest.clearAllMocks();

        mockSelect = jest.fn().mockResolvedValue(mockAccounts);

        mockQuery = {
            sort: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            populate: jest.fn().mockReturnThis(),
            lean: jest.fn().mockResolvedValue(mockTransactions)
        };

        accountModel.find.mockReturnValue({
            select: mockSelect
        });

        transactionModel.find.mockReturnValue(mockQuery);
    });

    test("should return transactions belonging to user's accounts", async () => {
        const response = await request(app).get("/api/transactions");

        expect(response.status).toBe(200);
        expect(response.body.transactions).toEqual(mockTransactions);

        expect(accountModel.find).toHaveBeenCalledWith({
            user: "user123"
        });

        expect(mockSelect).toHaveBeenCalledWith("_id");

        expect(transactionModel.find).toHaveBeenCalledWith({
            $or: [
                { fromAccount: { $in: ["account1", "account2"] } },
                { toAccount: { $in: ["account1", "account2"] } }
            ]
        });
    });

    test("should return empty array when user has no accounts", async () => {
        mockSelect.mockResolvedValue([]);

        const response = await request(app).get("/api/transactions");

        expect(response.status).toBe(200);
        expect(response.body.transactions).toEqual([]);
        expect(transactionModel.find).not.toHaveBeenCalled();
    });

    test("should sort transactions by latest date and ID", async () => {
        await request(app).get("/api/transactions");

        expect(mockQuery.sort).toHaveBeenCalledWith({
            createdAt: -1,
            _id: -1
        });
    });

    test("should limit transaction history to 10 records", async () => {
        await request(app).get("/api/transactions");

        expect(mockQuery.limit).toHaveBeenCalledWith(10);
    });

    test("should populate account details and return lean documents", async () => {
        await request(app).get("/api/transactions");

        expect(mockQuery.populate).toHaveBeenNthCalledWith(
            1,
            "fromAccount",
            "currency status"
        );

        expect(mockQuery.populate).toHaveBeenNthCalledWith(
            2,
            "toAccount",
            "currency status"
        );

        expect(mockQuery.lean).toHaveBeenCalled();
    });

    test("should return 500 when account lookup fails", async () => {
        mockSelect.mockRejectedValue(new Error("Database connection failed"));

        const response = await request(app).get("/api/transactions");

        expect(response.status).toBe(500);
        expect(response.body.message).toBe(
            "Unable to fetch transaction history."
        );

        expect(transactionModel.find).not.toHaveBeenCalled();
    });

    test("should return 500 when transaction lookup fails", async () => {
        mockQuery.lean.mockRejectedValue(new Error("Transaction query failed"));

        const response = await request(app).get("/api/transactions");

        expect(response.status).toBe(500);
        expect(response.body.message).toBe(
            "Unable to fetch transaction history."
        );
    });
});
