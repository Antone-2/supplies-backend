/**
 * Production-ready configuration management
 * Handles environment-specific settings with validation and fallbacks
 */

const path = require('path');

// Load environment variables
require('dotenv').config();

/**
 * Configuration object with environment-specific settings
 */
const config = {
    // ======================== ENVIRONMENT ========================
    NODE_ENV: process.env.NODE_ENV,

    // ======================== SERVER CONFIG ========================
    PORT: parseInt(process.env.PORT),
    BACKEND_URL: process.env.BACKEND_URL,
    FRONTEND_URL: process.env.FRONTEND_URL,

    // ======================== CORS CONFIG ========================
    CORS_ORIGINS: process.env.CORS_ORIGINS
        ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
        : [],

    // ======================== DATABASE ========================
    MONGO_URI: process.env.MONGO_URI,

    // ======================== JWT CONFIG ========================
    JWT: {
        SECRET: process.env.JWT_SECRET,
        REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
        EXPIRE: process.env.JWT_EXPIRE,
        REFRESH_EXPIRE: process.env.JWT_REFRESH_EXPIRE
    },

    // ======================== SESSION CONFIG ========================
    SESSION_SECRET: process.env.SESSION_SECRET,

    // ======================== EMAIL CONFIG ========================
    EMAIL: {
        HOST: process.env.EMAIL_HOST,
        PORT: parseInt(process.env.EMAIL_PORT),
        USER: process.env.EMAIL_USER,
        PASS: process.env.EMAIL_PASS,
        FROM: process.env.EMAIL_FROM,
        BREVO_API_KEY: process.env.BREVO_API_KEY
    },

    // ======================== CLOUDINARY CONFIG ========================
    CLOUDINARY: {
        CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
        API_KEY: process.env.CLOUDINARY_API_KEY,
        API_SECRET: process.env.CLOUDINARY_API_SECRET
    },

    // ======================== PESAPAL CONFIG ========================
    PESAPAL: {
        CONSUMER_KEY: process.env.PESAPAL_CONSUMER_KEY,
        CONSUMER_SECRET: process.env.PESAPAL_CONSUMER_SECRET,
        CALLBACK_URL: process.env.PESAPAL_CALLBACK_URL,
        REDIRECT_URL: process.env.PESAPAL_REDIRECT_URL,
        CANCEL_URL: process.env.PESAPAL_CANCEL_URL,
        TEST_MODE: process.env.PESAPAL_TEST_MODE,
        BASE_URL: process.env.PESAPAL_TEST_MODE
            ? process.env.PESAPAL_SANDBOX_URL
            : process.env.PESAPAL_PRODUCTION_URL
    },

    // ======================== GOOGLE OAUTH CONFIG ========================
    GOOGLE_OAUTH: {
        CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
        CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET
    },

    // ======================== MONITORING CONFIG ========================
    SENTRY: {
        DSN: process.env.SENTRY_DSN,
        ENVIRONMENT: process.env.NODE_ENV
    },

    // ======================== RATE LIMITING ========================
    RATE_LIMIT: {
        MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
        WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000 // 15 minutes
    },

    // ======================== SSL CONFIG (Production) ========================
    SSL: {
        CERT_PATH: process.env.SSL_CERT_PATH,
        KEY_PATH: process.env.SSL_KEY_PATH
    }
};

/**
 * Validate critical configuration values
 */
function validateConfig() {
    const errors = [];

    // Required in all environments
    const required = [
        'MONGO_URI',
        'JWT_SECRET',
        'JWT_REFRESH_SECRET',
        'SESSION_SECRET',
        'BACKEND_URL',
        'FRONTEND_URL',
        'CORS_ORIGINS'
    ];

    // Additional production requirements
    if (config.NODE_ENV) {
        required.push(
            'EMAIL_HOST',
            'EMAIL_PORT',
            'EMAIL_USER',
            'EMAIL_PASS',
            'EMAIL_FROM',
            'PESAPAL_CONSUMER_KEY',
            'PESAPAL_CONSUMER_SECRET',
            'PESAPAL_CALLBACK_URL',
            'PESAPAL_REDIRECT_URL',
            'PESAPAL_CANCEL_URL',
            'PESAPAL_PRODUCTION_URL',
            'GOOGLE_CLIENT_ID',
            'GOOGLE_CLIENT_SECRET'
        );
    } for (const key of required) {
        const keys = key.split('_');
        let value = process.env[key];

        if (!value) {
            errors.push(`Missing required environment variable: ${key}`);
        }
    }

    // Validate JWT secrets are strong enough
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
        errors.push('JWT_SECRET should be at least 32 characters long for security');
    }

    if (process.env.JWT_REFRESH_SECRET && process.env.JWT_REFRESH_SECRET.length < 32) {
        errors.push('JWT_REFRESH_SECRET should be at least 32 characters long for security');
    }

    // Validate PORT
    if (isNaN(config.PORT) || config.PORT <= 0 || config.PORT > 65535) {
        errors.push('PORT must be a valid port number between 1 and 65535');
    }

    return errors;
}

/**
 * Get environment-specific configuration
 */
function getEnvironmentConfig() {
    const env = config.NODE_ENV;

    switch (env) {
        case 'production':
            return {
                ...config,
                // Production overrides
                PESAPAL: {
                    ...config.PESAPAL,
                    TEST_MODE: false,
                    BASE_URL: process.env.PESAPAL_PRODUCTION_URL
                },
                // Disable debug logs in production
                LOG_LEVEL: 'error'
            };

        case 'staging':
            return {
                ...config,
                // Staging overrides
                LOG_LEVEL: 'warn'
            };

        case 'test':
            return {
                ...config,
                // Test overrides
                MONGO_URI: process.env.MONGO_TEST_URI || config.MONGO_URI,
                PESAPAL: {
                    ...config.PESAPAL,
                    TEST_MODE: true
                },
                LOG_LEVEL: 'silent'
            };

        case 'development':
        default:
            return {
                ...config,
                LOG_LEVEL: 'debug'
            };
    }
}

/**
 * Initialize and validate configuration
 */
function initializeConfig() {
    const errors = validateConfig();

    if (errors.length > 0) {
        console.error('❌ Configuration validation failed:');
        errors.forEach(error => console.error(`  - ${error}`));

        if (config.NODE_ENV === 'production') {
            console.error('Exiting due to configuration errors in production environment');
            process.exit(1);
        } else {
            console.warn('⚠️ Configuration warnings in development environment');
        }
    } else {
        console.log(`✅ Configuration validated successfully for ${config.NODE_ENV} environment`);
    }

    return getEnvironmentConfig();
}

module.exports = initializeConfig();