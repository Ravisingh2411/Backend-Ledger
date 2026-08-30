require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        type: 'OAuth2',
        user: process.env.EMAIL_USER,
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        refreshToken: process.env.REFRESH_TOKEN,
    },
});

// Verify the connection configuration
transporter.verify((error, success) => {
    if (error) {
        console.error('Error connecting to email server:', error);
    } else {
        console.log('Email server is ready to send messages');
    }
});

// Function to send email
const sendEmail = async (to, subject, text, html) => {
    try {
        const info = await transporter.sendMail({
            from: `"Backend Ledger" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            text,
            html,
        });

        console.log('Message sent:', info.messageId);
    } catch (error) {
        console.error('Error sending email:', error);
    }
};

// Registration email
async function sendRegistrationEmail(userEmail, name) {
    const subject = "Welcome to Backend Ledger";

    const text = `
        Hello ${name},

        Welcome to Backend Ledger!

        Your account has been successfully created.

        We're happy to have you with us.

        Regards,
        Backend Ledger Team`;

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
            <h1 style="color: #333;">Welcome to Backend Ledger 🎉</h1>

            <p>Hello <strong>${name}</strong>,</p>

            <p>
                Your account has been successfully created.
                We're happy to have you with us!
            </p>

            <p>
                You can now start using Backend Ledger and explore all its features.
            </p>

            <br>

            <p>Regards,</p>
            <p><strong>Backend Ledger Team</strong></p>
        </div>
    `;

    await sendEmail(userEmail, subject, text, html);
}

async function sendTransactionEmail(userEmail, name, amount, toAccount) {
    const subject = 'Transaction Successful!';
    const text = `Hello ${name},\n\nYour transaction of ${amount} to account ${toAccount} was successful.\n\nBest regards,\nThe Backend Ledger Team`;
    const html = `<p>Hello ${name},</p><p>Your transaction of ${amount} to account ${toAccount} was successful.</p><p>Best regards,<br>The Backend Ledger Team</p>`;

    await sendEmail(userEmail, subject, text, html);
}

async function sendTransactionFailureEmail(userEmail, name, amount, toAccount) {
    const subject = 'Transaction Failed';
    const text = `Hello ${name},\n\nWe regret to inform you that your transaction of ${amount} to account ${toAccount} has failed. Please try again later.\n\nBest regards,\nThe Backend Ledger Team`;
    const html = `<p>Hello ${name},</p><p>We regret to inform you that your transaction of ${amount} to account ${toAccount} has failed. Please try again later.</p><p>Best regards,<br>The Backend Ledger Team</p>`;

    await sendEmail(userEmail, subject, text, html);
}
async function sendMoneyReceivedEmail(userEmail, name, amount, fromAccount) {
    const subject = 'Money Credited to Your Account!';

    const text = `Hello ${name},

    An amount of ${amount} has been credited to your account from account ${fromAccount}.

    Best regards,
    The Backend Ledger Team`;

    const html = `
        <p>Hello ${name},</p>
        <p>An amount of <strong>${amount}</strong> has been credited to your account from account <strong>${fromAccount}</strong>.</p>
        <p>Best regards,<br>The Backend Ledger Team</p>
    `;

    await sendEmail(userEmail, subject, text, html);
}

module.exports = {
    sendRegistrationEmail,
    sendTransactionEmail,
    sendTransactionFailureEmail,
    sendMoneyReceivedEmail
};