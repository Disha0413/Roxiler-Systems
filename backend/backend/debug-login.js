const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

(async () => {
    try {
        const email = process.argv[2] || 'admin@app.com';
        const password = process.argv[3] || 'Admin@123';

        console.log('Connecting to database...');
        const result = await pool.query('SELECT id, name, email, role, address, password FROM users WHERE email = $1', [email]);
        console.log('Query rows:', result.rows);

        if (result.rows.length === 0) {
            console.log('No user found.');
            process.exit(0);
        }

        const user = result.rows[0];
        console.log('Comparing password...');
        const match = await bcrypt.compare(password, user.password);
        console.log('Password match:', match);
    } catch (error) {
        console.error('Debug login error:', error);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
})();
