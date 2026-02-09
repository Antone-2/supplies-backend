const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const compression = require('compression');
const validator = require('validator');
const config = require('../config/environment');


const createRateLimiter = (windowMs, max, message, options = {}) => {
    return rateLimit({
        windowMs,
        max,
        message: {
            error: message || 'Too many requests, please try again later.',
            retryAfter: Math.ceil(windowMs / 1000)
        },
        standardHeaders: true,
        legacyHeaders: false,
        skip: (req) => config.NODE_ENV === 'test',
        handler: (req, res) => {
            console.warn('Rate limit exceeded', {
                ip: req.ip,
                path: req.path,
                userAgent: req.get('User-Agent')
            });
            res.status(429).json({
                error: 'Rate limit exceeded',
                message: message || 'Too many requests from this IP, please try again later.',
                retryAfter: Math.ceil(windowMs / 1000)
            });
        },
        ...options
    });
};


const generalLimiter = createRateLimiter(15 * 60 * 1000, 100);
const authLimiter = createRateLimiter(15 * 60 * 1000, 5);
const paymentLimiter = createRateLimiter(60 * 1000, 3);
const apiLimiter = createRateLimiter(1 * 60 * 1000, 60);


const setupSecurity = (app) => {

    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                fontSrc: ["'self'", "https://fonts.gstatic.com"],
                imgSrc: ["'self'", "data:", "https:", "http:"],
                scriptSrc: ["'self'"],
                connectSrc: ["'self'", process.env.FRONTEND_URL, "https://api.pesapal.com"],
            },
        },
        crossOriginEmbedderPolicy: false
    }));


    app.use(mongoSanitize());


    app.use(xss());


    app.use('/api/v1/auth/login', authLimiter);
    app.use('/api/v1/auth/register', authLimiter);
    app.use('/api/v1/payment/', paymentLimiter);
    app.use('/api/v1/', apiLimiter);
    app.use(generalLimiter);
};


const validateInput = {

    email: (req, res, next) => {
        const { email } = req.body;
        if (email && !validator.isEmail(email)) {
            return res.status(400).json({
                error: 'Validation error',
                message: 'Invalid email format'
            });
        }
        next();
    },


    phone: (req, res, next) => {
        const { phone } = req.body;
        if (phone && !validator.isMobilePhone(phone, 'any', { strictMode: false })) {
            return res.status(400).json({
                error: 'Validation error',
                message: 'Invalid phone number format'
            });
        }
        next();
    },


    password: (req, res, next) => {
        const { password } = req.body;
        if (password) {
            if (password.length < 8) {
                return res.status(400).json({
                    error: 'Validation error',
                    message: 'Password must be at least 8 characters long'
                });
            }
            if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
                return res.status(400).json({
                    error: 'Validation error',
                    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
                });
            }
        }
        next();
    },


    objectId: (paramName) => (req, res, next) => {
        const id = req.params[paramName] || req.body[paramName];
        if (id && !validator.isMongoId(id)) {
            return res.status(400).json({
                error: 'Validation error',
                message: `Invalid ${paramName} format`
            });
        }
        next();
    },


    amount: (req, res, next) => {
        const { amount } = req.body;
        if (amount !== undefined) {
            const numAmount = parseFloat(amount);
            if (isNaN(numAmount) || numAmount <= 0 || numAmount > 1000000) {
                return res.status(400).json({
                    error: 'Validation error',
                    message: 'Amount must be a positive number less than 1,000,000'
                });
            }
        }
        next();
    }
};


const errorHandler = (err, req, res, next) => {
    console.error('Error Stack:', err.stack);

    let error = { ...err };
    error.message = err.message;


    if (err.name === 'CastError') {
        const message = 'Resource not found';
        error = { message, statusCode: 404 };
    }


    if (err.code === 11000) {
        const message = 'Duplicate field value entered';
        error = { message, statusCode: 400 };
    }


    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map(val => val.message);
        error = { message: message.join(', '), statusCode: 400 };
    }


    if (err.name === 'JsonWebTokenError') {
        const message = 'Invalid token';
        error = { message, statusCode: 401 };
    }

    if (err.name === 'TokenExpiredError') {
        const message = 'Token expired';
        error = { message, statusCode: 401 };
    }

    res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Server Error',
        ...(process.env.NODE_ENV && { stack: err.stack })
    });
};


const notFound = (req, res, next) => {
    const error = new Error(`Route not found - ${req.originalUrl}`);
    res.status(404);
    next(error);
};

module.exports = {
    setupSecurity,
    validateInput,
    errorHandler,
    notFound,
    generalLimiter,
    authLimiter,
    paymentLimiter,
    apiLimiter
};
