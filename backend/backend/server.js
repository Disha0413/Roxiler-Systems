// Load environment variables from .env file
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') }); 

const express = require('express');
const { Pool } = require('pg'); 
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const port = 3001; 

// JWT Secret (In production, use a strong secret from environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const SALT_ROUNDS = 10;

// Middleware to parse JSON request bodies
app.use(express.json());

// Enable CORS (Allow multiple origins for development)
app.use(cors({
    origin: ['http://127.0.0.1:8000', 'http://localhost:8000', 'http://127.0.0.1:5500', 'http://localhost:5500'],
    credentials: true
}));

// Log all incoming requests (for debugging)
app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.path} from ${req.headers.origin || 'unknown'}`);
    next();
});

// --- DATABASE SETUP ---

// Initialize PostgreSQL connection pool
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Database connection error:', err.stack);
        console.error('Check your .env file and ensure PostgreSQL is running.');
    } else {
        console.log('Database connected successfully!');
    }
});

// --- VALIDATION HELPERS ---

const validate = {
    name: (name) => {
        if (!name || name.length < 20) return 'Name must be at least 20 characters.';
        if (name.length > 60) return 'Name cannot exceed 60 characters.';
        return null;
    },
    address: (address) => {
        if (!address || address.length === 0) return 'Address is required.';
        if (address.length > 400) return 'Address cannot exceed 400 characters.';
        return null;
    },
    password: (password) => {
        if (!password || password.length < 8) return 'Password must be 8-16 characters.';
        if (password.length > 16) return 'Password must be 8-16 characters.';
        if (!/[A-Z]/.test(password)) return 'Password must include at least one uppercase letter.';
        if (!/[!@#$%^&*()]/.test(password)) return 'Password must include at least one special character (!@#$%^&*()).';
        return null;
    },
    email: (email) => {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Invalid email format.';
        return null;
    },
    rating: (rating) => {
        const r = Number(rating);
        if (isNaN(r) || r < 1 || r > 5) return 'Rating must be between 1 and 5.';
        return null;
    }
};

// --- AUTHENTICATION MIDDLEWARE ---

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        req.user = user; // Attach user info to request
        next();
    });
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
};

// Middleware to check if user is store owner
const requireStoreOwner = (req, res, next) => {
    if (req.user.role !== 'store_owner') {
        return res.status(403).json({ message: 'Store owner access required' });
    }
    next();
};

// Middleware to check if user is a normal user
const requireUser = (req, res, next) => {
    if (req.user.role !== 'user') {
        return res.status(403).json({ message: 'User access required' });
    }
    next();
};

// --- ROUTES ---

// Simple Health Check Endpoint
app.get('/', (req, res) => {
    res.send('Rating Platform Backend is running!');
});

// Implement Login route with JWT
app.post('/api/auth/login', async (req, res) => {
    console.log('[LOGIN] Request received:', { email: req.body?.email, hasPassword: !!req.body?.password });
    
    const { email, password } = req.body;
    
    // Validation
    if (!email || !password) {
        console.log('[LOGIN] Validation failed: missing email or password');
        return res.status(400).json({ message: 'Email and password are required' });
    }
    
    try {
        console.log('[LOGIN] Querying database for user:', email);
        const result = await pool.query(
            'SELECT id, name, email, role, address, password FROM users WHERE email = $1', 
            [email]
        );
        
        console.log('[LOGIN] Query result:', { found: result.rows.length > 0, rowCount: result.rows.length });
        
        if (result.rows.length === 0) {
            console.log('[LOGIN] User not found');
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        const user = result.rows[0];
        console.log('[LOGIN] User found:', { id: user.id, email: user.email, role: user.role, hasHashedPassword: !!user.password });
        
        // Compare hashed password
        console.log('[LOGIN] Comparing passwords...');
        const passwordMatch = await bcrypt.compare(password, user.password);
        console.log('[LOGIN] Password match result:', passwordMatch);
        
        if (!passwordMatch) {
            console.log('[LOGIN] Password mismatch');
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        // Remove password from user object
        delete user.password;
        
        // Get storeId for store owners
        if (user.role === 'store_owner') {
            console.log('[LOGIN] Fetching store ID for store owner');
            const storeResult = await pool.query('SELECT id FROM stores WHERE owner_id = $1', [user.id]);
            user.storeId = storeResult.rows[0]?.id;
            console.log('[LOGIN] Store ID:', user.storeId);
        }
        
        // Generate JWT token
        console.log('[LOGIN] Generating JWT token');
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        console.log('[LOGIN] Login successful for user:', user.email);
        res.json({ ...user, token });
    } catch (error) {
        console.error('[LOGIN] ERROR:', error);
        console.error('[LOGIN] Error stack:', error.stack);
        res.status(500).json({ message: 'Server error during login.' });
    }
});


// Implement Signup route (Normal User only)
app.post('/api/auth/signup', async (req, res) => {
    const { name, email, address, password } = req.body;
    
    // Validation
    const nameError = validate.name(name);
    const emailError = validate.email(email);
    const addressError = validate.address(address);
    const passwordError = validate.password(password);
    
    if (nameError || emailError || addressError || passwordError) {
        return res.status(400).json({ 
            message: nameError || emailError || addressError || passwordError 
        });
    }
    
    try {
        const existing = await pool.query('SELECT 1 FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ message: 'Email already exists' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        
        const result = await pool.query(
            'INSERT INTO users (name, email, password, address, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, address',
            [name, email, hashedPassword, address, 'user']
        );
        
        const user = result.rows[0];
        
        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.status(201).json({ ...user, token });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Server error during signup.' });
    }
});


// Implement Get Users route (Requires authentication - admin or any logged-in user for viewing)
app.get('/api/data/users', authenticateToken, async (req, res) => {
    try {
        // Use a JOIN to get the storeId for store owners in a single query
        const usersResult = await pool.query(`
            SELECT 
                u.id, 
                u.name, 
                u.email, 
                u.role, 
                u.address, 
                s.id AS store_id 
            FROM users u
            LEFT JOIN stores s ON u.id = s.owner_id
            ORDER BY u.id
        `);
        
        const users = usersResult.rows.map(row => ({
            id: row.id,
            name: row.name,
            email: row.email,
            role: row.role,
            address: row.address,
            storeId: row.store_id // Null for non-owners
        }));

        res.json(users);
    } catch (error) {
        console.error('Get Users error:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});


// Implement Get Stores route (Public or authenticated)
app.get('/api/data/stores', authenticateToken, async (req, res) => {
    try {
        const storesResult = await pool.query('SELECT id, name, email, address, owner_id FROM stores ORDER BY id');
        res.json(storesResult.rows);
    } catch (error) {
        console.error('Get Stores error:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});


// Implement Get Ratings route (Authenticated)
app.get('/api/data/ratings', authenticateToken, async (req, res) => {
    try {
        const ratingsResult = await pool.query(`
            SELECT r.id, r.user_id, r.store_id, r.rating, u.email AS user_email
            FROM ratings r
            JOIN users u ON r.user_id = u.id
            ORDER BY r.id
        `);
        res.json(ratingsResult.rows);
    } catch (error) {
        console.error('Get Ratings error:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});


// Implement Add User (Admin only functionality)
app.post('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    const { name, email, address, password, role } = req.body;
    
    // Validation
    const nameError = validate.name(name);
    const emailError = validate.email(email);
    const addressError = validate.address(address);
    const passwordError = validate.password(password);
    
    if (nameError || emailError || addressError || passwordError) {
        return res.status(400).json({ 
            message: nameError || emailError || addressError || passwordError 
        });
    }
    
    if (!role || !['admin', 'user'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role. Must be admin or user.' });
    }
    
    try {
        const existing = await pool.query('SELECT 1 FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ message: 'Email already exists' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        
        const result = await pool.query(
            'INSERT INTO users (name, email, password, address, role) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [name, email, hashedPassword, address, role]
        );
        
        res.status(201).json({ message: 'User added successfully', userId: result.rows[0].id });
    } catch (error) {
        console.error('Add User error:', error);
        res.status(500).json({ message: 'Server error adding user.' });
    }
});


// Implement Add Store (Admin only functionality - creates both store and owner)
app.post('/api/admin/stores', authenticateToken, requireAdmin, async (req, res) => {
    const { name, email, address } = req.body;
    
    // Validation
    const nameError = validate.name(name);
    const emailError = validate.email(email);
    const addressError = validate.address(address);
    
    if (nameError || emailError || addressError) {
        return res.status(400).json({ 
            message: nameError || emailError || addressError 
        });
    }
    
    const defaultPassword = 'Store@123'; // Default password for new store owners
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Hash the default password
        const hashedPassword = await bcrypt.hash(defaultPassword, SALT_ROUNDS);

        // 1. Create the store owner user
        const ownerResult = await client.query(
            'INSERT INTO users (name, email, password, address, role) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [`${name} Owner`, email, hashedPassword, address, 'store_owner']
        );
        const ownerId = ownerResult.rows[0].id;

        // 2. Create the store
        const storeResult = await client.query(
            'INSERT INTO stores (name, email, address, owner_id) VALUES ($1, $2, $3, $4) RETURNING id',
            [name, email, address, ownerId]
        );
        const storeId = storeResult.rows[0].id;

        await client.query('COMMIT');
        res.status(201).json({ message: 'Store and Owner added successfully', storeId, ownerId });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Add Store/Owner error:', error);
        if (error.code === '23505') { // Unique violation error code
            return res.status(400).json({ message: 'Email already exists for a user/owner.' });
        }
        res.status(500).json({ message: 'Server error adding store/owner.' });
    } finally {
        client.release();
    }
});


// Implement Password Update (All authenticated users)
app.put('/api/users/:userId/password', authenticateToken, async (req, res) => {
    const { userId } = req.params;
    const { newPassword } = req.body;
    
    // Ensure user can only update their own password (unless admin)
    if (req.user.id !== parseInt(userId) && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'You can only update your own password' });
    }
    
    // Validate password
    const passwordError = validate.password(newPassword);
    if (passwordError) {
        return res.status(400).json({ message: passwordError });
    }
    
    try {
        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
        
        await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, userId]);
        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Password update error:', error);
        res.status(500).json({ message: 'Failed to update password.' });
    }
});


// Implement Submit Rating (Authenticated users - typically normal users)
app.post('/api/ratings', authenticateToken, async (req, res) => {
    const { userId, storeId, rating } = req.body;
    
    // Ensure user can only rate as themselves
    if (req.user.id !== userId) {
        return res.status(403).json({ message: 'You can only submit ratings as yourself' });
    }
    
    // Validate rating
    const ratingError = validate.rating(rating);
    if (ratingError) {
        return res.status(400).json({ message: ratingError });
    }
    
    // Validate storeId exists
    if (!storeId) {
        return res.status(400).json({ message: 'Store ID is required' });
    }
    
    try {
        const result = await pool.query(
            'INSERT INTO ratings (user_id, store_id, rating) VALUES ($1, $2, $3) ON CONFLICT (user_id, store_id) DO UPDATE SET rating = $3 RETURNING id',
            [userId, storeId, rating]
        );
        
        res.status(201).json({ message: 'Rating submitted/updated successfully', ratingId: result.rows[0].id });
    } catch (error) {
        console.error('Rating submission error:', error);
        res.status(500).json({ message: 'Failed to submit rating.' });
    }
});


// Start the server
const server = app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

// Diagnostics for unexpected shutdowns
process.on('exit', (code) => {
    console.log(`[Server] Process exiting with code ${code}`);
});

process.on('SIGINT', () => {
    console.log('[Server] Received SIGINT. Shutting down gracefully...');
    server.close(() => process.exit(0));
});

process.on('SIGTERM', () => {
    console.log('[Server] Received SIGTERM. Shutting down gracefully...');
    server.close(() => process.exit(0));
});

process.on('uncaughtException', (err) => {
    console.error('[Server] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason) => {
    console.error('[Server] Unhandled Rejection:', reason);
});

setInterval(() => {
    console.log('[Server] heartbeat - process is alive');
}, 10000);

module.exports = { app, server };
