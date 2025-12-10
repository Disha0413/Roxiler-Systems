// Seed script to populate the database with initial test data
// Run this after creating the schema: node db/seedData.js

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const SALT_ROUNDS = 10;

async function seedDatabase() {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        console.log('Starting database seeding...');
        
        // Hash passwords
        const adminPassword = await bcrypt.hash('Admin@123', SALT_ROUNDS);
        const userPassword = await bcrypt.hash('User@123', SALT_ROUNDS);
        const storePassword = await bcrypt.hash('Store@123', SALT_ROUNDS);
        
        // Insert users
        console.log('Inserting users...');
        
        // 1. Admin User
        const adminResult = await client.query(
            'INSERT INTO users (name, email, password, address, role) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            ['Admin User Administrator', 'admin@app.com', adminPassword, '123 System Lane, Admin City', 'admin']
        );
        console.log(`✓ Admin user created (ID: ${adminResult.rows[0].id})`);
        
        // 2. Normal User - Jane Doe
        const janeResult = await client.query(
            'INSERT INTO users (name, email, password, address, role) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            ['Jane Doe Normal User Account', 'jane@user.com', userPassword, '456 Normal Street, User City', 'user']
        );
        console.log(`✓ Jane Doe created (ID: ${janeResult.rows[0].id})`);
        
        // 3. Store Owner - MegaMart
        const megamartOwnerResult = await client.query(
            'INSERT INTO users (name, email, password, address, role) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            ['MegaMart Owner Account Manager', 'megamart@owner.com', storePassword, '700 Industrial Avenue, Store City', 'store_owner']
        );
        const megamartOwnerId = megamartOwnerResult.rows[0].id;
        console.log(`✓ MegaMart owner created (ID: ${megamartOwnerId})`);
        
        // 4. Store Owner - QuickStop
        const quickstopOwnerResult = await client.query(
            'INSERT INTO users (name, email, password, address, role) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            ['QuickStop Owner Manager Account', 'qs@owner.com', storePassword, '888 City Center Boulevard, Downtown', 'store_owner']
        );
        const quickstopOwnerId = quickstopOwnerResult.rows[0].id;
        console.log(`✓ QuickStop owner created (ID: ${quickstopOwnerId})`);
        
        // 5. Normal User - Alice Smith
        const aliceResult = await client.query(
            'INSERT INTO users (name, email, password, address, role) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            ['Alice Smith Regular User Testing', 'alice@test.com', userPassword, '101 Pine Street, Residential Area', 'user']
        );
        console.log(`✓ Alice Smith created (ID: ${aliceResult.rows[0].id})`);
        
        // 6. Normal User - Bob Johnson
        const bobResult = await client.query(
            'INSERT INTO users (name, email, password, address, role) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            ['Bob Johnson Normal User Test Account', 'bob@test.com', userPassword, '202 Oak Street Apartment 5B', 'user']
        );
        console.log(`✓ Bob Johnson created (ID: ${bobResult.rows[0].id})`);
        
        // Insert stores
        console.log('\nInserting stores...');
        
        // 1. MegaMart
        const megamartStoreResult = await client.query(
            'INSERT INTO stores (name, email, address, owner_id) VALUES ($1, $2, $3, $4) RETURNING id',
            ['MegaMart Superstore Chain', 'megamart@store.com', '700 Industrial Avenue, Store City', megamartOwnerId]
        );
        const megamartStoreId = megamartStoreResult.rows[0].id;
        console.log(`✓ MegaMart store created (ID: ${megamartStoreId})`);
        
        // 2. QuickStop Deli
        const quickstopStoreResult = await client.query(
            'INSERT INTO stores (name, email, address, owner_id) VALUES ($1, $2, $3, $4) RETURNING id',
            ['QuickStop Deli and Convenience Store', 'quickstop@store.com', '888 City Center Boulevard, Downtown', quickstopOwnerId]
        );
        const quickstopStoreId = quickstopStoreResult.rows[0].id;
        console.log(`✓ QuickStop store created (ID: ${quickstopStoreId})`);
        
        // Insert ratings
        console.log('\nInserting ratings...');
        
        // Jane rates MegaMart: 5 stars
        await client.query(
            'INSERT INTO ratings (user_id, store_id, rating) VALUES ($1, $2, $3)',
            [janeResult.rows[0].id, megamartStoreId, 5]
        );
        console.log('✓ Jane rated MegaMart: 5 stars');
        
        // Alice rates MegaMart: 4 stars
        await client.query(
            'INSERT INTO ratings (user_id, store_id, rating) VALUES ($1, $2, $3)',
            [aliceResult.rows[0].id, megamartStoreId, 4]
        );
        console.log('✓ Alice rated MegaMart: 4 stars');
        
        // Bob rates QuickStop: 5 stars
        await client.query(
            'INSERT INTO ratings (user_id, store_id, rating) VALUES ($1, $2, $3)',
            [bobResult.rows[0].id, quickstopStoreId, 5]
        );
        console.log('✓ Bob rated QuickStop: 5 stars');
        
        // Jane rates QuickStop: 3 stars
        await client.query(
            'INSERT INTO ratings (user_id, store_id, rating) VALUES ($1, $2, $3)',
            [janeResult.rows[0].id, quickstopStoreId, 3]
        );
        console.log('✓ Jane rated QuickStop: 3 stars');
        
        await client.query('COMMIT');
        console.log('\n✅ Database seeding completed successfully!');
        console.log('\n📝 Login Credentials:');
        console.log('   Admin: admin@app.com / Admin@123');
        console.log('   User: jane@user.com / User@123');
        console.log('   Store Owner: megamart@owner.com / Store@123');
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error seeding database:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the seed function
seedDatabase()
    .then(() => {
        console.log('\nDatabase connection closed.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Failed to seed database:', error);
        process.exit(1);
    });
