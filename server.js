import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import xssClean from 'xss-clean';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import 'dotenv/config';

// Initialize configuration
import initializeConfig from './config/environment.js';
const config = initializeConfig(); // Load and validate configuration

// Accept either MONGO_URI or legacy MONGODB_URI
process.env.MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!process.env.MONGO_URI) {
    console.error('FATAL: MONGO_URI (or MONGODB_URI) is not set. Please check your environment configuration.');
    process.exit(1);
}

import session from 'express-session';
const app = express();

// Observability: Sentry (if DSN provided) & pino logger
import * as Sentry from '@sentry/node';
import pino from 'pino';
import pinoHttp from 'pino-http';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// Sentry error monitoring is disabled due to missing/invalid DSN
if (process.env.SENTRY_DSN && process.env.SENTRY_DSN !== 'your_sentry_dsn') {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        tracesSampleRate: 1.0,
        integrations: [
            Sentry.httpIntegration({ tracing: true }),
            Sentry.expressIntegration(),
        ],
    });
}

// Preferred port
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PREFERRED_PORT = parseInt(process.env.PORT, 10);
let PORT = PREFERRED_PORT;
const MONGO_URI = process.env.MONGO_URI;

// Security & parsing middleware
app.set('trust proxy', 1); // if behind nginx / load balancer
app.use(helmet());

// CORS configuration - include both www and non-www domains for production
const corsOrigins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim()) : [];
if (process.env.NODE_ENV === 'production') {
    // Ensure both www and non-www domains are included for production
    const requiredOrigins = ['https://medhelmsupplies.co.ke', 'https://www.medhelmsupplies.co.ke'];
    requiredOrigins.forEach(origin => {
        if (!corsOrigins.includes(origin)) {
            corsOrigins.push(origin);
        }
    });
}
app.use(cors({ origin: corsOrigins.length > 0 ? corsOrigins : true, credentials: true }));
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

// Structured request logging
app.use(pinoHttp({ logger }));

// Routes
import authRoutes from './src/routes/authRoutes.js';
import passwordRoutes from './src/routes/passwordRoutes.js';
import productRoutes from './src/modules/product/product.routes.js';
import categoryRoutes from './src/modules/category/category.routes.js';
import cartRoutes from './src/routes/cartRoutes.js';
import wishlistRoutes from './src/routes/wishlistRoutes.js';
import orderRoutes from './src/routes/orderRoutes.js';
import userRoutes from './src/routes/userRoutes.js';
import generalReviewRoutes from './src/routes/generalReviewRoutes.js';
import newsletterRoutes from './src/routes/newsletterRoutes.js';
import pesapalRoutes from './src/routes/pesapalRoutes.js';
import adminRoutes from './src/routes/adminRoutes.js';
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/auth', passwordRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/categories', categoryRoutes);
// Removed socialAuthRoutes to avoid overriding Google OAuth routes
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/wishlist', wishlistRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/general-reviews', generalReviewRoutes);
app.use('/api/v1/newsletter', newsletterRoutes);
app.use('/api/v1/pesapal', pesapalRoutes);
app.use('/api/v1/admin', adminRoutes);

// Import passport after routes to avoid circular dependency
import passport from './passport.js';
app.use(passport.initialize());
app.use(passport.session());

// Health endpoints (primary + alias) placed early to guarantee availability
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend is running!', time: new Date().toISOString() });
});
app.get('/healthz', (req, res) => {
    res.json({ status: 'ok', message: 'Health alias', time: new Date().toISOString() });
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
