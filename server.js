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


import config from './config/environment.js';


process.env.MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!process.env.MONGO_URI) {
    console.error('FATAL: MONGO_URI (or MONGODB_URI) is not set. Please check your environment configuration.');
    process.exit(1);
}

import session from 'express-session';
const app = express();


import * as Sentry from '@sentry/node';
import pino from 'pino';
import pinoHttp from 'pino-http';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });


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


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PREFERRED_PORT = parseInt(process.env.PORT, 10);
let PORT = PREFERRED_PORT;
const MONGO_URI = process.env.MONGO_URI;


app.set('trust proxy', 1);
app.use(helmet());


const corsOrigins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim()) : [];
if (process.env.NODE_ENV === 'production') {

    const requiredOrigins = [
        'https://medhelmsupplies.co.ke',
        'https://www.medhelmsupplies.co.ke',
    ];
    requiredOrigins.forEach(origin => {
        if (!corsOrigins.includes(origin)) {
            corsOrigins.push(origin);
        }
    });
}


if (process.env.NODE_ENV !== 'production') {
    corsOrigins.push('http://localhost:3000', 'http://localhost:5173', 'http://localhost:8080');
}


if (process.env.NODE_ENV === 'production') {
    corsOrigins.push('https://admin.medhelmsupplies.co.ke', 'http://admin.medhelmsupplies.co.ke');
}


corsOrigins.push('https://www.medhelmsupplies.co.ke');


console.log('CORS Origins configured:', corsOrigins);

app.use(cors({
    origin: function (origin, callback) {

        if (!origin) return callback(null, true);


        if (corsOrigins.includes(origin)) {
            return callback(null, true);
        }


        if (origin.startsWith('http://localhost:')) {
            return callback(null, true);
        }


        if (origin === 'https://medhelmsupplies.co.ke' || origin === 'https://www.medhelmsupplies.co.ke') {
            return callback(null, true);
        }

        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-Requested-With', 'Access-Control-Request-Method', 'Access-Control-Request-Headers']
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.text({ limit: '1mb', type: 'text/plain' }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(xssClean());


const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10),
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


app.use(pinoHttp({ logger }));


app.use('/uploads', express.static(resolve(__dirname, 'uploads'), {
    setHeaders: (res, path) => {
        res.set('Access-Control-Allow-Origin', 'https://medhelmsupplies.co.ke');
        res.set('Access-Control-Allow-Credentials', 'true');
        res.set('Cross-Origin-Resource-Policy', 'same-origin');
        res.set('Cross-Origin-Embedder-Policy', 'require-corp');
    }
}));


import authRoutes from './src/routes/authRoutes.js';
import passwordRoutes from './src/routes/passwordRoutes.js';
import productRoutes from './src/routes/productRoutes.js';
import categoryRoutes from './src/modules/category/category.routes.js';
import cartRoutes from './src/routes/cartRoutes.js';
import wishlistRoutes from './src/routes/wishlistRoutes.js';
import orderRoutes from './src/routes/orderRoutes.js';
import userRoutes from './src/routes/userRoutes.js';
import generalReviewRoutes from './src/routes/generalReviewRoutes.js';
import newsletterRoutes from './src/routes/newsletterRoutes.js';
import pesapalRoutes from './src/routes/pesapalRoutes.js';
import adminRoutes from './src/routes/adminRoutes.js';
import adminAuthRoutes from './src/routes/adminAuthRoutes.js';
import keepAliveRoutes from './src/routes/keepAliveRoutes.js';
import invoiceRoutes from './src/routes/invoiceRoutes.js';
import ipnRoutes from './src/routes/ipnRoutes.js';
import inventoryRoutes from './src/routes/inventoryRoutes.js';
import reminderRoutes from './src/routes/reminderRoutes.js';
import notificationRoutes from './src/routes/notificationRoutes.js';
import { startScheduler } from './src/utils/scheduler.js';

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/auth', passwordRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/categories', categoryRoutes);

app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/wishlist', wishlistRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/general-reviews', generalReviewRoutes);
app.use('/api/v1/newsletter', newsletterRoutes);
app.use('/api/v1/pesapal', pesapalRoutes);
app.use('/api/v1/invoices', invoiceRoutes);
app.use('/api/v1/payments', ipnRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/reminders', reminderRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/admin/auth', adminAuthRoutes);
app.use('/api/v1', keepAliveRoutes);
app.use('/api/v1/admin', adminRoutes);


import passport from './passport.js';
app.use(passport.initialize());
app.use(passport.session());


app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend is running!', time: new Date().toISOString() });
});
app.get('/healthz', (req, res) => {
    res.json({ status: 'ok', message: 'Health alias', time: new Date().toISOString() });
});


app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'Not Found' });
    }
    next();
});



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

        startScheduler();
        logger.info('Cron scheduler started');

        const attemptListen = (attemptsLeft = 5) => {
            server = app.listen(PORT)
                .once('listening', () => {
                    logger.info({ port: PORT }, 'Server listening');
                })
                .once('error', (err) => {
                    if (err.code === 'EADDRINUSE' && attemptsLeft > 0) {
                        logger.warn({ portTried: PORT }, 'Port in use, trying next');
                        PORT += 1;
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


const shutdown = (signal) => {
    logger.warn({ signal }, 'Received shutdown signal');
    Promise.resolve()
        .then(() => server && server.close())
        .then(() => mongoose.connection.close())
        .then(() => logger.info('Shutdown complete'))
        .finally(() => process.exit(0));
};
['SIGINT', 'SIGTERM'].forEach(sig => process.on(sig, () => shutdown(sig)));
