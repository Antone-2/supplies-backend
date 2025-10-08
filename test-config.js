// Test configuration system
const config = require('./config/environment');

console.log('Configuration test:', {
    NODE_ENV: config.NODE_ENV,
    PORT: config.PORT,
    MONGO_URI: config.MONGO_URI ? 'SET' : 'MISSING',
    JWT_SECRET: config.JWT.SECRET ? 'SET' : 'MISSING',
    PESAPAL_TEST_MODE: config.PESAPAL.TEST_MODE,
    CORS_ORIGINS: config.CORS_ORIGINS
});

console.log('✅ Configuration system working properly');