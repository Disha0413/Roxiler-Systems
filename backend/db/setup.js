// Quick script to create schema from Node.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// First connect without specifying a database to create it if needed
const createDbPool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: 'postgres', // Connect to default postgres database first
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function setupDatabase() {
    console.log('🔧 Setting up database...\n');
    
    try {
        // Try to create the database (will fail if it exists, which is fine)
        console.log('Creating database if it doesn\'t exist...');
        try {
            await createDbPool.query(`CREATE DATABASE ${process.env.DB_DATABASE}`);
            console.log('✅ Database created successfully!');
        } catch (err) {
            if (err.code === '42P04') {
                console.log('ℹ️  Database already exists, continuing...');
            } else {
                throw err;
            }
        }
        
        await createDbPool.end();
        
        // Now connect to the actual database
        const pool = new Pool({
            user: process.env.DB_USER,
            host: process.env.DB_HOST,
            database: process.env.DB_DATABASE,
            password: process.env.DB_PASSWORD,
            port: process.env.DB_PORT,
        });
        
        console.log('\n📄 Reading schema file...');
        const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        console.log('🔨 Creating tables and constraints...');
        await pool.query(schema);
        
        console.log('✅ Schema created successfully!\n');
        
        await pool.end();
        
        console.log('✅ Database setup complete!');
        console.log('\n📝 Next steps:');
        console.log('   1. Run seed data: npm run seed');
        console.log('   2. Start the server: npm start\n');
        
    } catch (error) {
        console.error('❌ Error setting up database:', error);
        process.exit(1);
    }
}

setupDatabase();
