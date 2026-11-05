
require('dotenv').config();

const http = require('http');
const mongoose = require('mongoose');
const app = require('./src/app');
const connectDB = require('./src/config/db');

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        await connectDB();

        const server = http.createServer(app);

        server.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });

        async function shutdown(signal) {
            console.log(`${signal} received. Shutting down gracefully...`);

            server.close(async () => {
                try {
                    await mongoose.connection.close();
                    console.log('Database connection closed');
                    process.exit(0);
                } catch (error) {
                    console.error('Error during shutdown:', error);
                    process.exit(1);
                }
            });

            setTimeout(() => {
                console.error('Forced shutdown due to timeout');
                process.exit(1);
            }, 10000).unref();
        }

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));

    } catch (error) {
        console.error('Server startup failed:', error.message);
        process.exit(1);
    }
}

startServer();
