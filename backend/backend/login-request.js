const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { server } = require('./server');

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
    const email = process.argv[2] || 'admin@app.com';
    const password = process.argv[3] || 'Admin@123';

    try {
        console.log('Waiting for server to finish booting...');
        await wait(1200);

        const response = await fetch('http://localhost:3001/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const text = await response.text();
        console.log('Response status:', response.status);
        console.log('Response body:', text);
    } catch (error) {
        console.error('Login request failed:', error);
        process.exitCode = 1;
    } finally {
        server.close(() => {
            console.log('Server closed.');
            process.exit();
        });
    }
})();
