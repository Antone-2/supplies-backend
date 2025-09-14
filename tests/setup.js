const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test database
process.env.MONGO_URI = 'mongodb://localhost:27017/medhelm_test';

// Global test setup
beforeAll(async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
    } catch (error) {
        console.error('Test database connection failed:', error);
    }
});

// Global test teardown
afterAll(async () => {
    try {
        await mongoose.connection.close();
    } catch (error) {
        console.error('Error closing test database connection:', error);
    }
});
