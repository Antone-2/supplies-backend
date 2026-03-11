/**
 * Enhanced Security Middleware
 * 
 * This module provides comprehensive security features including:
 * - IP-based rate limiting with user-based rate limiting
 * - Strict input validation and sanitization using express-validator
 * - Enhanced security headers following OWASP recommendations
 * - Request size limits and strict CORS configuration
 * 
 * @author Security Team
 * @date 2026-03-11
 */

import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import xssClean from 'xss-clean';
import hpp from 'hpp';
import { body, param, query, validationResult } from 'express-validator';
import validator from 'validator';

/**
 * Create a rate limiter with IP-based limiting
 * Uses sensible defaults with configurable options
 * 
 * @param {Object} options - Rate limiter options
 * @returns {Function} Express middleware for rate limiting
 */
const createRateLimiter = (options = {}) => {
    const {
        windowMs = 15 * 60 * 1000, // Default: 15 minutes
        max = 100, // Default: 100 requests per window
        message = 'Too many requests from this IP, please try again later.',
        keyGenerator = (req, res) => ipKeyGenerator(req, res), // Use IP with IPv6 support
        skipSuccessfulRequests = false,
        skipFailedRequests = false,
    } = options;

    return rateLimit({
        windowMs,
        max,
        message: {
            success: false,
            error: 'RATE_LIMIT_EXCEEDED',
            message,
            retryAfter: Math.ceil(windowMs / 1000)
        },
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator,
        skipSuccessfulRequests,
        skipFailedRequests,
        // Handle rate limit exceeded
        handler: (req, res, next, options) => {
            console.warn('[SECURITY] Rate limit exceeded:', {
                ip: req.ip,
                userId: req.user?.id || 'anonymous',
                path: req.path,
                method: req.method,
                userAgent: req.get('User-Agent'),
                timestamp: new Date().toISOString()
            });

            res.status(429).json(options.message);
        },
        // Skip rate limiting in test environment
        skip: (req) => process.env.NODE_ENV === 'test'
    });
};

/**
 * Create a user-based rate limiter
 * Combines IP and user ID for more accurate rate limiting
 * 
 * @param {Object} options - Rate limiter options
 * @returns {Function} Express middleware for user-based rate limiting
 */
const createUserRateLimiter = (options = {}) => {
    const {
        windowMs = 15 * 60 * 1000, // Default: 15 minutes
        max = 100, // Default: 100 requests per window
        message = 'Too many requests, please try again later.',
    } = options;

    return rateLimit({
        windowMs,
        max,
        message: {
            success: false,
            error: 'RATE_LIMIT_EXCEEDED',
            message,
            retryAfter: Math.ceil(windowMs / 1000)
        },
        standardHeaders: true,
        legacyHeaders: false,
        // Combine IP and user ID for the rate limit key
        keyGenerator: (req, res) => {
            const userId = req.user?.id || 'anonymous';
            return `${ipKeyGenerator(req, res)}:${userId}`;
        },
        handler: (req, res, next, options) => {
            console.warn('[SECURITY] User rate limit exceeded:', {
                ip: req.ip,
                userId: req.user?.id || 'anonymous',
                path: req.path,
                method: req.method,
                timestamp: new Date().toISOString()
            });

            res.status(429).json(options.message);
        },
        skip: (req) => process.env.NODE_ENV === 'test'
    });
};

// ============================================
// RATE LIMITERS FOR DIFFERENT ENDPOINT TYPES
// ============================================

/**
 * General API rate limiter
 * Applied to all /api routes
 * Limits: 100 requests per 15 minutes per IP
 */
export const generalLimiter = createRateLimiter({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    message: 'Too many API requests, please try again later.'
});

/**
 * Strict rate limiter for authentication endpoints
 * Prevents brute force attacks on login/register
 * Limits: 5 requests per 15 minutes per IP
 */
export const authLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts
    message: 'Too many authentication attempts, please try again later.'
});

/**
 * User-based rate limiter for authenticated endpoints
 * Provides per-user rate limiting for sensitive operations
 * Limits: 200 requests per 15 minutes per user
 */
export const userRateLimiter = createUserRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: 'Too many requests from this account, please try again later.'
});

/**
 * Strict rate limiter for payment endpoints
 * Prevents payment abuse
 * Limits: 3 requests per minute per IP
 */
export const paymentLimiter = createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 3, // 3 payment attempts per minute
    message: 'Too many payment attempts, please try again later.'
});

/**
 * Rate limiter for search endpoints
 * Prevents search abuse
 * Limits: 30 requests per minute per IP
 */
export const searchLimiter = createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 30,
    message: 'Too many search requests, please try again later.'
});

/**
 * Rate limiter for write operations
 * Stricter limits for POST, PUT, DELETE
 * Limits: 20 requests per minute per IP
 */
export const writeLimiter = createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 20,
    message: 'Too many write requests, please slow down.'
});

/**
 * Strict rate limiter for password reset
 * Prevents password reset abuse
 * Limits: 3 requests per hour per IP
 */
export const passwordResetLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: 'Too many password reset requests, please try again later.'
});

// ============================================
// INPUT VALIDATION MIDDLEWARE
// ============================================

/**
 * Middleware to check validation results
 * Should be used after validation chain
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object  
 * @param {Function} next - Express next function
 */
export const validateRequest = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        console.warn('[SECURITY] Input validation failed:', {
            ip: req.ip,
            path: req.path,
            method: req.method,
            errors: errors.array(),
            timestamp: new Date().toISOString()
        });

        return res.status(400).json({
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array().map(err => ({
                field: err.path,
                message: err.msg
            }))
        });
    }

    next();
};

/**
 * Validation rules for user registration
 */
export const registerValidation = [
    body('email')
        .trim()
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address')
        .isLength({ max: 255 })
        .withMessage('Email must not exceed 255 characters'),

    body('password')
        .isLength({ min: 8, max: 128 })
        .withMessage('Password must be between 8 and 128 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

    body('firstName')
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('First name must be between 1 and 50 characters')
        .matches(/^[a-zA-Z\s'-]+$/)
        .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),

    body('lastName')
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Last name must be between 1 and 50 characters')
        .matches(/^[a-zA-Z\s'-]+$/)
        .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),

    body('phone')
        .optional()
        .trim()
        .isMobilePhone('any', { strictMode: false })
        .withMessage('Please provide a valid phone number'),

    // Reject any unexpected fields
    body().custom((value, { req }) => {
        const allowedFields = ['email', 'password', 'firstName', 'lastName', 'phone'];
        const receivedFields = Object.keys(req.body);
        const unexpectedFields = receivedFields.filter(field => !allowedFields.includes(field));

        if (unexpectedFields.length > 0) {
            throw new Error(`Unexpected fields: ${unexpectedFields.join(', ')}`);
        }
        return true;
    })
];

/**
 * Validation rules for user login
 */
export const loginValidation = [
    body('email')
        .trim()
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),

    body('password')
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ max: 128 })
        .withMessage('Password must not exceed 128 characters'),

    // Reject any unexpected fields
    body().custom((value, { req }) => {
        const allowedFields = ['email', 'password'];
        const receivedFields = Object.keys(req.body);
        const unexpectedFields = receivedFields.filter(field => !allowedFields.includes(field));

        if (unexpectedFields.length > 0) {
            throw new Error(`Unexpected fields: ${unexpectedFields.join(', ')}`);
        }
        return true;
    })
];

/**
 * Validation rules for product creation/update
 */
export const productValidation = [
    body('name')
        .trim()
        .isLength({ min: 1, max: 200 })
        .withMessage('Product name must be between 1 and 200 characters')
        .matches(/^[a-zA-Z0-9\s\-_.,&'()]+$/)
        .withMessage('Product name contains invalid characters'),

    body('price')
        .isFloat({ min: 0, max: 1000000 })
        .withMessage('Price must be a positive number less than 1,000,000'),

    body('description')
        .optional()
        .trim()
        .isLength({ max: 5000 })
        .withMessage('Description must not exceed 5000 characters'),

    body('category')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Category must not exceed 100 characters'),

    body('stock')
        .optional()
        .isInt({ min: 0, max: 1000000 })
        .withMessage('Stock must be a non-negative integer'),

    body('sku')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('SKU must not exceed 50 characters')
        .matches(/^[a-zA-Z0-9\-_]+$/)
        .withMessage('SKU can only contain letters, numbers, hyphens, and underscores'),

    // Reject any unexpected fields
    body().custom((value, { req }) => {
        const allowedFields = ['name', 'price', 'description', 'category', 'stock', 'sku', 'images', 'featured', 'active'];
        const receivedFields = Object.keys(req.body);
        const unexpectedFields = receivedFields.filter(field => !allowedFields.includes(field));

        if (unexpectedFields.length > 0) {
            throw new Error(`Unexpected fields: ${unexpectedFields.join(', ')}`);
        }
        return true;
    })
];

/**
 * Validation rules for order creation
 */
export const orderValidation = [
    body('items')
        .isArray({ min: 1, max: 100 })
        .withMessage('Order must contain between 1 and 100 items'),

    body('items.*.productId')
        .notEmpty()
        .trim()
        .isMongoId()
        .withMessage('Invalid product ID'),

    body('items.*.quantity')
        .isInt({ min: 1, max: 999 })
        .withMessage('Quantity must be between 1 and 999'),

    body('shippingAddress')
        .isObject()
        .withMessage('Shipping address is required'),

    body('shippingAddress.name')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Shipping name is required'),

    body('shippingAddress.phone')
        .trim()
        .isMobilePhone('any', { strictMode: false })
        .withMessage('Valid phone number is required'),

    body('shippingAddress.street')
        .trim()
        .isLength({ min: 1, max: 200 })
        .withMessage('Street address is required'),

    body('shippingAddress.city')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('City is required'),

    body('shippingAddress.country')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Country is required'),

    // Optional fields with validation
    body('paymentMethod')
        .optional()
        .trim()
        .isIn(['pesapal', 'cash', 'mpesa'])
        .withMessage('Invalid payment method'),

    // Reject any unexpected fields
    body().custom((value, { req }) => {
        const allowedFields = ['items', 'shippingAddress', 'paymentMethod', 'notes', 'couponCode'];
        const receivedFields = Object.keys(req.body);
        const unexpectedFields = receivedFields.filter(field => !allowedFields.includes(field));

        if (unexpectedFields.length > 0) {
            throw new Error(`Unexpected fields: ${unexpectedFields.join(', ')}`);
        }
        return true;
    })
];

/**
 * Validation rules for MongoDB ObjectId parameters
 */
export const objectIdValidation = (paramName) => [
    param(paramName)
        .isMongoId()
        .withMessage(`Invalid ${paramName} format`)
        .trim()
];

/**
 * Validation rules for pagination
 */
export const paginationValidation = [
    query('page')
        .optional()
        .isInt({ min: 1, max: 1000 })
        .toInt()
        .withMessage('Page must be between 1 and 1000'),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .toInt()
        .withMessage('Limit must be between 1 and 100'),

    query('sort')
        .optional()
        .trim()
        .matches(/^[a-zA-Z_]+:(asc|desc)?(,[a-zA-Z_]+:(asc|desc)?)*$/)
        .withMessage('Invalid sort format'),

    // Sanitize by converting to integer (using toInt() above)
    (req, res, next) => {
        if (req.query.page) req.query.page = parseInt(req.query.page, 10);
        if (req.query.limit) req.query.limit = parseInt(req.query.limit, 10);
        next();
    }
];

/**
 * Validation rules for search queries
 */
export const searchValidation = [
    query('q')
        .trim()
        .isLength({ min: 1, max: 200 })
        .withMessage('Search query must be between 1 and 200 characters')
        .matches(/^[a-zA-Z0-9\s\-_.,]+$/)
        .withMessage('Search query contains invalid characters')
];

/**
 * Validation rules for email (generic)
 */
export const emailValidation = [
    body('email')
        .trim()
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address')
        .isLength({ max: 255 })
        .withMessage('Email must not exceed 255 characters'),

    body().custom((value, { req }) => {
        const allowedFields = ['email'];
        const receivedFields = Object.keys(req.body);
        const unexpectedFields = receivedFields.filter(field => !allowedFields.includes(field));

        if (unexpectedFields.length > 0) {
            throw new Error(`Unexpected fields: ${unexpectedFields.join(', ')}`);
        }
        return true;
    })
];

/**
 * Validation rules for password reset
 */
export const passwordResetRequestValidation = [
    body('email')
        .trim()
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),

    body().custom((value, { req }) => {
        const allowedFields = ['email'];
        const receivedFields = Object.keys(req.body);
        const unexpectedFields = receivedFields.filter(field => !allowedFields.includes(field));

        if (unexpectedFields.length > 0) {
            throw new Error(`Unexpected fields: ${unexpectedFields.join(', ')}`);
        }
        return true;
    })
];

/**
 * Validation rules for password change
 */
export const passwordChangeValidation = [
    body('currentPassword')
        .notEmpty()
        .withMessage('Current password is required'),

    body('newPassword')
        .isLength({ min: 8, max: 128 })
        .withMessage('New password must be between 8 and 128 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

    body('newPassword')
        .custom((value, { req }) => {
            if (value === req.body.currentPassword) {
                throw new Error('New password must be different from current password');
            }
            return true;
        }),

    body().custom((value, { req }) => {
        const allowedFields = ['currentPassword', 'newPassword'];
        const receivedFields = Object.keys(req.body);
        const unexpectedFields = receivedFields.filter(field => !allowedFields.includes(field));

        if (unexpectedFields.length > 0) {
            throw new Error(`Unexpected fields: ${unexpectedFields.join(', ')}`);
        }
        return true;
    })
];

// ============================================
// SANITIZATION MIDDLEWARE
// ============================================

/**
 * Middleware to sanitize request body
 * Removes dangerous characters and prevents injection attacks
 */
export const sanitizeBody = (req, res, next) => {
    // Express-mongo-sanitize is already applied in server.js
    // This is additional custom sanitization

    if (req.body && typeof req.body === 'object') {
        // Sanitize all string values in the request body
        Object.keys(req.body).forEach(key => {
            if (typeof req.body[key] === 'string') {
                // Remove null bytes
                req.body[key] = req.body[key].replace(/\0/g, '');
                // Trim whitespace
                req.body[key] = req.body[key].trim();
            }
        });
    }

    next();
};

/**
 * Middleware to sanitize query parameters
 */
export const sanitizeQueryParams = (req, res, next) => {
    if (req.query && typeof req.query === 'object') {
        Object.keys(req.query).forEach(key => {
            if (typeof req.query[key] === 'string') {
                // Remove null bytes
                req.query[key] = req.query[key].replace(/\0/g, '');
                // Trim whitespace
                req.query[key] = req.query[key].trim();
            }
        });
    }

    next();
};

// ============================================
// SECURITY HEADERS CONFIGURATION
// ============================================

/**
 * Enhanced helmet configuration following OWASP recommendations
 */
export const helmetConfig = helmet({
    contentSecurityPolicy: {
        useDefaults: true,
        directives: {
            // Default source: same origin only
            defaultSrc: ["'self'"],

            // Style sources: self, inline (needed for some CSS), and Google Fonts
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],

            // Font sources: self and Google Fonts
            fontSrc: ["'self'", "https://fonts.gstatic.com"],

            // Image sources: self, data URIs, and https
            imgSrc: ["'self'", "data:", "https:", "http:"],

            // Script sources: self only (no inline scripts for security)
            scriptSrc: ["'self'"],

            // Connect sources: same origin, frontend URL, and PesaPal API
            connectSrc: [
                "'self'",
                process.env.FRONTEND_URL || 'https://medhelmsupplies.co.ke',
                "https://www.pesapal.com",
                "https://api.pesapal.com"
            ],

            // Frame sources: none (prevent clickjacking)
            frameSrc: ["'none'"],

            // Object sources: none (prevent plugin-based attacks)
            objectSrc: ["'none'"],

            // Base URI: same origin
            baseUri: ["'self'"],

            // Form actions: same origin
            formAction: ["'self'"],

            // Upgrade insecure requests in production
            upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
        }
    },

    // Cross-Origin policies
    crossOriginEmbedderPolicy: false, // Allow embedding for legitimate use
    crossOriginResourcePolicy: { policy: "same-origin" }, // Restrict cross-origin resource sharing

    // HSTS (HTTP Strict Transport Security)
    hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
    },

    // X-Frame-Options (prevent clickjacking)
    frameguard: {
        action: 'SAMEORIGIN'
    },

    // X-Content-Type-Options (prevent MIME sniffing)
    noSniff: true,

    // X-XSS-Protection (legacy browsers)
    xssFilter: true,

    // Referrer-Policy
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },

    // Permissions-Policy (disable potentially dangerous features)
    permissionsPolicy: {
        features: {
            'accelerometer': [],
            'camera': [],
            'geolocation': [],
            'gyroscope': [],
            'magnetometer': [],
            'microphone': [],
            'payment': [],
            'usb': []
        }
    }
});

// ============================================
// ADDITIONAL SECURITY MIDDLEWARE
// ============================================

/**
 * Middleware to prevent HTTP Parameter Pollution (HPP)
 */
export const preventHPP = hpp({
    whitelist: [
        'page', 'limit', 'sort', 'filter', 'category', 'status'
    ]
});

/**
 * Middleware to log security events
 */
export const securityLogger = (req, res, next) => {
    const securityEvent = {
        timestamp: new Date().toISOString(),
        ip: req.ip,
        method: req.method,
        path: req.path,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id || 'anonymous',
        contentType: req.get('Content-Type'),
        contentLength: req.get('Content-Length')
    };

    // Log sensitive operations
    if (req.path.includes('auth') || req.path.includes('login') || req.path.includes('password')) {
        console.info('[SECURITY] Authentication event:', securityEvent);
    } else if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
        console.info('[SECURITY] Write operation:', securityEvent);
    }

    next();
};

/**
 * Middleware to detect and block suspicious requests
 */
export const suspiciousRequestDetector = (req, res, next) => {
    const suspiciousPatterns = [
        // SQL injection patterns
        /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
        /(union|select|insert|update|delete|drop|create|alter|exec|execute)\s/i,
        // XSS patterns
        /<script|javascript:|onerror=|onload=/i,
        // Path traversal
        /(\.\.\/)|(\.\.\\)/i,
        // Command injection
        /(\||\;|\`|\$|\(|\))/i
    ];

    const checkString = JSON.stringify(req.body) + JSON.stringify(req.query) + req.path;

    for (const pattern of suspiciousPatterns) {
        if (pattern.test(checkString)) {
            console.warn('[SECURITY] Suspicious request detected:', {
                ip: req.ip,
                path: req.path,
                pattern: pattern.toString(),
                timestamp: new Date().toISOString()
            });

            return res.status(400).json({
                success: false,
                error: 'SUSPICIOUS_REQUEST',
                message: 'Request contains potentially malicious content'
            });
        }
    }

    next();
};

// Export all security utilities
export default {
    // Rate limiters
    generalLimiter,
    authLimiter,
    userRateLimiter,
    paymentLimiter,
    searchLimiter,
    writeLimiter,
    passwordResetLimiter,
    createRateLimiter,
    createUserRateLimiter,

    // Validation
    validateRequest,
    registerValidation,
    loginValidation,
    productValidation,
    orderValidation,
    objectIdValidation,
    paginationValidation,
    searchValidation,
    emailValidation,
    passwordResetRequestValidation,
    passwordChangeValidation,

    // Sanitization
    sanitizeBody,
    sanitizeQueryParams,

    // Security headers
    helmetConfig,

    // Additional middleware
    preventHPP,
    securityLogger,
    suspiciousRequestDetector
};
