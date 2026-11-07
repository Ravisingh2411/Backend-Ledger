
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { OAuth2Client } = require('google-auth-library');

require('dotenv').config({
    path: path.join(__dirname, '../.env')
});

const envPath = path.join(__dirname, '../.env');

const { EMAIL_USER, CLIENT_ID, CLIENT_SECRET } = process.env;

if (!EMAIL_USER || !CLIENT_ID || !CLIENT_SECRET) {
    console.error('Missing OAuth configuration in .env');
    process.exit(1);
}

const state = require('crypto').randomBytes(24).toString('hex');

const server = require('http').createServer(async (req, res) => {
    const callbackUrl = new URL(req.url, 'http://127.0.0.1');

    if (callbackUrl.pathname !== '/oauth2callback') {
        res.writeHead(404);
        res.end('Not found');
        return;
    }

    if (callbackUrl.searchParams.get('state') !== state) {
        res.writeHead(400);
        res.end('Invalid OAuth state.');
        server.close();
        return;
    }

    const error = callbackUrl.searchParams.get('error');
    const code = callbackUrl.searchParams.get('code');

    if (error || !code) {
        res.writeHead(400);
        res.end('Google authorization was not completed.');
        console.error('Google authorization failed:', error || 'No code received');
        server.close();
        return;
    }

    try {
        const redirectUri =
            `http://127.0.0.1:${server.address().port}/oauth2callback`;

        const oauth2Client = new OAuth2Client(
            CLIENT_ID,
            CLIENT_SECRET,
            redirectUri
        );

        const { tokens } = await oauth2Client.getToken(code);

        if (!tokens.refresh_token) {
            throw new Error(
                'No refresh token received. Run authorization again with consent.'
            );
        }

        let envContent = fs.readFileSync(envPath, 'utf8');

        if (/^REFRESH_TOKEN\s*=/m.test(envContent)) {
            envContent = envContent.replace(
                /^REFRESH_TOKEN\s*=.*$/m,
                `REFRESH_TOKEN=${tokens.refresh_token}`
            );
        } else {
            envContent += `\nREFRESH_TOKEN=${tokens.refresh_token}\n`;
        }

        fs.writeFileSync(envPath, envContent, 'utf8');

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
            <h2>Gmail authorization successful!</h2>
            <p>Refresh token saved in backend/.env.</p>
            <p>You can close this tab.</p>
        `);

        console.log('SUCCESS: New refresh token saved in backend/.env');
        console.log('Authorized Gmail account:', EMAIL_USER);
    } catch (err) {
        res.writeHead(500);
        res.end('Authorization failed. Check backend terminal.');
        console.error('OAuth error:', err.message);
    } finally {
        server.close();
    }
});

server.listen(0, '127.0.0.1', () => {
    const redirectUri =
        `http://127.0.0.1:${server.address().port}/oauth2callback`;

    const oauth2Client = new OAuth2Client(
        CLIENT_ID,
        CLIENT_SECRET,
        redirectUri
    );

    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: ['https://mail.google.com/'],
        state
    });

    const parsedUrl = new URL(authUrl);

    if (parsedUrl.searchParams.get('response_type') !== 'code') {
        console.error('OAuth URL is missing response_type=code.');
        server.close();
        process.exit(1);
    }

    console.log('Opening Google authorization...');
    console.log('Authorized account:', EMAIL_USER);
    console.log('OAuth URL parameters verified.');

    execFile(
        'rundll32.exe',
        ['url.dll,FileProtocolHandler', authUrl],
        (err) => {
            if (err) {
                console.error('Automatic browser opening failed.');
                console.log('Open Google authorization URL manually:');
                console.log(authUrl);
            }
        }
    );
});

setTimeout(() => {
    console.error('Authorization timed out. Run the script again.');
    server.close();
    process.exit(1);
}, 180000).unref();
