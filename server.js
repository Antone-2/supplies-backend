// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xssClean = require('xss-clean');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Accept either MONGO_URI or legacy MONGODB_URI
process.env.MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!process.env.MONGO_URI) {
    console.error('FATAL: MONGO_URI (or MONGODB_URI) is not set. Please check your environment configuration.');
    process.exit(1);
}

const passport = require('./passport');
const session = require('express-session');
const app = express();
// Observability: Sentry (if DSN provided) & pino logger
const Sentry = require('@sentry/node');
const pino = require('pino');
const pinoHttp = require('pino-http');
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
// Sentry error monitoring is disabled due to missing/invalid DSN
// const Sentry = require('@sentry/node');
// const SentryTracing = require('@sentry/tracing');
// if (process.env.SENTRY_DSN && process.env.SENTRY_DSN !== 'your_sentry_dsn') {
//     Sentry.init({
//         dsn: process.env.SENTRY_DSN,
//         tracesSampleRate: 1.0,
//     });
//     app.use(Sentry.Handlers.requestHandler());
//     app.use(Sentry.Handlers.tracingHandler());
//   }
// ...existing code...
// Test endpoint to confirm backend receives POST requests
app.post('/api/v1/test', (req, res) => {
    console.log('Test endpoint hit', req.body);
    res.json({ message: 'Test endpoint received', data: req.body });
});
// Preferred port
const PREFERRED_PORT = parseInt(process.env.PORT || '5000', 10);
let PORT = PREFERRED_PORT;
const MONGO_URI = process.env.MONGO_URI;


// Security & parsing middleware
app.set('trust proxy', 1); // if behind nginx / load balancer
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : true, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(xssClean());

// Rate limiting (basic global)
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10), // 15 minutes default
    max: parseInt(process.env.RATE_LIMIT_MAX || '300', 10),
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api', limiter);
app.use(session({
    secret: process.env.SESSION_SECRET || 'keyboard cat',
    resave: false,
    saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());

// Structured request logging
app.use(pinoHttp({ logger }));

// Helper debug logs for sensitive helper endpoints (kept minimal)
app.use((req, _res, next) => {
    if (req.path.includes('get-verification-token') || req.path.includes('get-reset-token')) {
        logger.debug({ path: req.path, body: req.body }, 'Helper endpoint invoked');
    }
    next();
});




// Routes
const authRoutes = require('./src/routes/authRoutes');
const productRoutes = require('./src/modules/product/product.routes');
const categoryRoutes = require('./src/modules/category/category.routes');
const socialAuthRoutes = require('./src/routes/socialAuthRoutes');
const cartRoutes = require('./src/routes/cartRoutes');
const wishlistRoutes = require('./src/routes/wishlistRoutes');
const orderRoutes = require('./src/routes/orderRoutes');
const userRoutes = require('./src/routes/userRoutes');
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/auth', socialAuthRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/wishlist', wishlistRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/users', userRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend is running!' });
});

// 404 handler
app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'Not Found' });
    }
    next();
});

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
    logger.error({ err }, 'Unhandled application error');
    if (process.env.NODE_ENV !== 'production') {
        return res.status(500).json({ error: err.message, stack: err.stack });
    }
    res.status(500).json({ error: 'Internal Server Error' });
});

console.log('Connecting to MongoDB at', MONGO_URI);
let server;
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        logger.info('Connected to MongoDB');
        const attemptListen = (attemptsLeft = 5) => {
            server = app.listen(PORT)
                .once('listening', () => {
                    logger.info({ port: PORT }, 'Server listening');
                })
                .once('error', (err) => {
                    if (err.code === 'EADDRINUSE' && attemptsLeft > 0) {
                        logger.warn({ portTried: PORT }, 'Port in use, trying next');
                        PORT += 1; // increment port
                        setTimeout(() => attemptListen(attemptsLeft - 1), 300);
                    } else {
                        logger.error({ err }, 'Failed to bind server port');
                        process.exit(1);
                    }
                });
        };
        attemptListen();
    })
    .catch((err) => {
        logger.error({ err }, 'MongoDB connection error');
        process.exit(1);
    });

// Graceful shutdown
const shutdown = (signal) => {
    logger.warn({ signal }, 'Received shutdown signal');
    Promise.resolve()
        .then(() => server && server.close())
        .then(() => mongoose.connection.close())
        .then(() => logger.info('Shutdown complete'))
        .finally(() => process.exit(0));
};
['SIGINT', 'SIGTERM'].forEach(sig => process.on(sig, () => shutdown(sig)));
