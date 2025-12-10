-- Rating Platform Seed Data
-- Note: Passwords shown here are plain text for reference
-- The actual insertion will be done via the backend API with bcrypt hashing
-- Or use bcrypt to hash these passwords before running this script

-- This file is for reference. The actual seeding should be done after
-- implementing bcrypt hashing in the backend.

-- MANUAL SEED DATA (Run these INSERT statements AFTER hashing passwords with bcrypt)
-- Use bcrypt with salt rounds = 10

-- Password Reference (plain text - DO NOT use in production):
-- Admin password: Admin@123
-- User passwords: User@123
-- Store owner passwords: Store@123

-- Sample bcrypt hashes (salt rounds = 10) for reference:
-- Admin@123 -> $2b$10$rN5xKj3YvgK5X7X5X5X5XeG5X5X5X5X5X5X5X5X5X5X5X5X5X5X
-- User@123  -> $2b$10$uN5xKj3YvgK5X7X5X5X5XeG5X5X5X5X5X5X5X5X5X5X5X5X5X5X
-- Store@123 -> $2b$10$sN5xKj3YvgK5X7X5X5X5XeG5X5X5X5X5X5X5X5X5X5X5X5X5X5X

-- Note: The hashes above are examples. Generate actual hashes using bcrypt before running.
-- You can use the backend API's signup endpoint or a Node.js script to generate hashes.

-- For initial testing, we'll create a helper script instead.
-- See seed.js for the actual seeding implementation.

/*
Example seed data structure:

USERS:
1. Admin User (admin@app.com) - role: admin
2. Jane Doe (jane@user.com) - role: user
3. MegaMart Owner (megamart@owner.com) - role: store_owner, storeId: 1
4. QuickStop Owner (qs@owner.com) - role: store_owner, storeId: 2
5. Alice Smith (alice@test.com) - role: user
6. Bob Johnson (bob@test.com) - role: user

STORES:
1. MegaMart (megamart@store.com) - owner_id: 3
2. QuickStop Deli (quickstop@store.com) - owner_id: 4

RATINGS:
- Jane (user 2) rated MegaMart (store 1): 5 stars
- Alice (user 5) rated MegaMart (store 1): 4 stars
- Bob (user 6) rated QuickStop (store 2): 5 stars
- Jane (user 2) rated QuickStop (store 2): 3 stars
*/
