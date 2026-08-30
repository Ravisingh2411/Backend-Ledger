const express = require('express');
const cookieparser = require('cookie-parser');

const app = express();
app.use(express.json());
app.use(cookieparser());

/**
* - Routes required
*/
const authRouter = require('./routes/auth.routes');
const accountRouter = require('./routes/account.routes');
const transactionRoutes = require('./routes/transaction.routes');

app.get('/', (req, res) => {
    res.send("Ledger service is up and running");
})

/**
* - Use Routes 
*/
app.use('/api/auth', authRouter);
app.use('/api/accounts', accountRouter);
app.use('/api/transactions', transactionRoutes);

module.exports = app;