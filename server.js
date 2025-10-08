// Load environment variables from main folder
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
// server.js - Production-ready eCommerce backend
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xssClean = require('xss-clean');
const { dirname, resolve } = require('path');
const path = require('path');

// Load and validate configuration
const config = require('./config/environment');

const session = require('express-session');
const MongoStore = require('connect-mongo');
const pino = require('pino');
const pinoHttp = require('pino-http');

// Initialize logger with config-based log level
const logger = pino({ level: config.LOG_LEVEL || 'info' });
const app = express();

// API versioning: all routes should use /api/v1/
app.use(pinoHttp({ logger }));

// Sentry error monitoring setup
const Sentry = require('@sentry/node');
const SentryTracing = require('@sentry/tracing');
if (config.SENTRY.DSN &&
    config.SENTRY.DSN &&
    config.SENTRY.DSN) {
    Sentry.init({
        dsn: config.SENTRY.DSN,
        environment: config.SENTRY.ENVIRONMENT,
        tracesSampleRate: config.NODE_ENV ? 0.1 : 1.0,
    });
    app.use(Sentry.Handlers.requestHandler());
    app.use(Sentry.Handlers.tracingHandler());
}
// ...existing code...
const Product = require('./Database/models/product.model.js');
const Order = require('./Database/models/order.model.js');
const User = require('./Database/models/user.model.js');

// Global search endpoint
app.get('/api/v1/search', async (req, res) => {
    const { type, q } = req.query;
    if (!type || !q) return res.status(400).json({ message: 'Missing type or query' });
    try {
        let results = [];
        if (type === 'products') {
            results = await Product.find({ $text: { $search: q } }).limit(20);
        } else if (type === 'orders') {
            results = await Order.find({
                $or: [
                    { orderId: { $regex: q, $options: 'i' } },
                    { customerName: { $regex: q, $options: 'i' } }
                ]
            }).limit(20);
        } else if (type === 'users') {
            results = await User.find({
                $or: [
                    { name: { $regex: q, $options: 'i' } },
                    { email: { $regex: q, $options: 'i' } }
                ]
            }).limit(20);
        } else {
            return res.status(400).json({ message: 'Invalid type' });
        }
        res.json({ results });
    } catch (err) {
        res.status(500).json({ message: 'Search failed' });
    }
});

// Global error handler middleware
app.use((err, req, res, next) => {
    console.error('API Error:', err);
    res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Internal Server Error',
        details: err.details || undefined
    });
});
// Enhanced health check endpoint with comprehensive monitoring
app.get('/api/health', async (req, res) => {
    const startTime = Date.now();
    const checks = {};
    let overallStatus = 'healthy';

    try {
        // Database connectivity check
        const dbState = mongoose.connection.readyState;
        const dbHealthy = dbState === 1;
        checks.database = {
            status: dbHealthy ? 'healthy' : 'unhealthy',
            state: dbState,
            responseTime: null
        };

        if (dbHealthy) {
            const dbStartTime = Date.now();
            await mongoose.connection.db.admin().ping();
            checks.database.responseTime = `${Date.now() - dbStartTime}ms`;
        } else {
            overallStatus = 'unhealthy';
        }

        // Memory usage check
        const memUsage = process.memoryUsage();
        const memHealthy = memUsage.heapUsed < memUsage.heapTotal * 0.9;
        checks.memory = {
            status: memHealthy ? 'healthy' : 'warning',
            used: Math.round(memUsage.heapUsed / 1024 / 1024),
            total: Math.round(memUsage.heapTotal / 1024 / 1024),
            percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
        };

        if (!memHealthy) {
            overallStatus = overallStatus === 'healthy' ? 'warning' : 'unhealthy';
        }

        // CPU usage approximation
        const cpuUsage = process.cpuUsage();
        checks.cpu = {
            user: cpuUsage.user,
            system: cpuUsage.system
        };

        // File system check (uploads directory)
        const fs = require('fs').promises;
        try {
            await fs.access('./uploads');
            checks.filesystem = { status: 'healthy', uploadsDir: 'accessible' };
        } catch {
            checks.filesystem = { status: 'warning', uploadsDir: 'not_accessible' };
            if (overallStatus === 'healthy') overallStatus = 'warning';
        }

        // External service checks (PesaPal)
        try {
            const { getAccessToken } = require('./src/services/pesapalService');
            const tokenStartTime = Date.now();
            await getAccessToken();
            checks.pesapal = {
                status: 'healthy',
                responseTime: `${Date.now() - tokenStartTime}ms`
            };
        } catch (error) {
            checks.pesapal = {
                status: 'unhealthy',
                error: error.message
            };
            overallStatus = 'unhealthy';
        }

        const responseTime = Date.now() - startTime;
        const uptime = process.uptime();

        res.json({
            status: overallStatus,
            timestamp: new Date().toISOString(),
            uptime: Math.floor(uptime),
            responseTime: `${responseTime}ms`,
            version: config.NODE_ENV ? '1.0.0' : process.env.npm_package_version || '1.0.0',
            environment: config.NODE_ENV,
            checks
        });

    } catch (err) {
        logger.error('Health check failed:', err);
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: err.message,
            responseTime: `${Date.now() - startTime}ms`
        });
    }
});

// Readiness probe (Kubernetes compatible)
app.get('/api/ready', async (req, res) => {
    try {
        // Check if database is ready
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ ready: false, reason: 'database_not_ready' });
        }

        // Check if critical services are initialized
        const memUsage = process.memoryUsage();
        if (memUsage.heapUsed > memUsage.heapTotal * 0.95) {
            return res.status(503).json({ ready: false, reason: 'memory_critical' });
        }

        res.json({ ready: true, timestamp: new Date().toISOString() });
    } catch (err) {
        res.status(503).json({ ready: false, error: err.message });
    }
});

// Liveness probe (Kubernetes compatible)
app.get('/api/live', (req, res) => {
    res.json({
        alive: true,
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime())
    });
});

// Load monitoring middleware
const { getMetrics, requestMetrics } = require('./src/middleware/monitoring');

// Metrics endpoint (protected in production)
app.get('/api/metrics', (req, res) => {
    // In production, add authentication middleware here
    if (config.NODE_ENV) {
        // Basic protection - use proper auth in real production
        const authHeader = req.headers.authorization;
        if (!authHeader || authHeader !== `Bearer ${process.env.METRICS_TOKEN || 'metrics-secret'}`) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
    }

    res.json(getMetrics());
});

// Port and database configuration from config system
let PORT = config.PORT;
const MONGO_URI = config.MONGO_URI;

// Security & parsing middleware
app.set('trust proxy', 1); // if behind nginx / load balancer
app.use(helmet({
    contentSecurityPolicy: config.NODE_ENV ? undefined : false,
    crossOriginEmbedderPolicy: config.NODE_ENV ? undefined : false
}));

// Production-ready CORS policy
const cors = require('cors');
app.use(cors({
    origin: config.CORS_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200 // Some legacy browsers choke on 204
}));

// Stricter rate limit for auth endpoints
app.use('/api/v1/auth', rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30, // 30 requests per window
    message: 'Too many authentication attempts, please try again later.'
}));
// Stricter rate limit for payment endpoints
app.use('/api/v1/payment', rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 requests per window
    message: 'Too many payment requests, please try again later.'
}));

// Enforce HTTPS in production
if (process.env.NODE_ENV) {
    app.use((req, res, next) => {
        if (req.method !== 'OPTIONS' && req.headers['x-forwarded-proto'] !== 'https') {
            return res.redirect('https://' + req.headers.host + req.url);
        }
        next();
    });
}

app.use(session({
    secret: config.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: config.MONGO_URI }),
    cookie: {
        secure: config.NODE_ENV,
        httpOnly: true,
        sameSite: config.NODE_ENV ? 'strict' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
}));
const jwtAuthMiddleware = require('./src/middleware/jwtAuthMiddleware');
app.use('/uploads', jwtAuthMiddleware, express.static('uploads'));
app.use(express.static('public'));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(xssClean());

// Add request monitoring
app.use(requestMetrics);

// Production-grade rate limiting
const limiter = rateLimit({
    windowMs: config.RATE_LIMIT.WINDOW_MS,
    max: config.RATE_LIMIT.MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req, res) => config.NODE_ENV, // Skip rate limiting in tests
    handler: (req, res) => {
        logger.warn('Rate limit exceeded', { ip: req.ip, path: req.path });
        res.status(429).json({
            error: 'Too many requests',
            message: 'Please try again later',
            retryAfter: Math.round(config.RATE_LIMIT.WINDOW_MS / 1000)
        });
    }
});
app.use('/api', limiter);

// Structured request logging
app.use(pinoHttp({ logger }));

// Routes
const authRoutes = require('./src/routes/authRoutes');
const productRoutes = require('./src/modules/product/product.routes');
const categoryRoutes = require('./src/modules/category/category.routes');
const cartRoutes = require('./src/routes/cartRoutes');
const wishlistRoutes = require('./src/routes/wishlistRoutes');
const orderRoutes = require('./src/routes/orderRoutes');
const userRoutes = require('./src/routes/userRoutes');
const newsletterRoutes = require('./src/routes/newsletter.routes');
const paymentRoutes = require('./src/routes/paymentRoutes');
const generalReviewRoutes = require('./src/routes/generalReviewRoutes');
// const notificationRoutes = require('./src/routes/notificationRoutes'); // Temporarily disabled
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/categories', categoryRoutes);
// Removed socialAuthRoutes to avoid overriding Google OAuth routes
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/wishlist', wishlistRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/newsletter', newsletterRoutes);
app.use('/api/v1/payment', paymentRoutes); // Fixed: changed from 'payments' to 'payment'
app.use('/api/v1/general-reviews', generalReviewRoutes);
// app.use('/api/v1/notifications', notificationRoutes); // Temporarily disabled

// Import passport after routes to avoid circular dependency
const passport = require('./passport');
app.use(passport.initialize());
app.use(passport.session());

// Health alias
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

// Serve static files and SPA routing only in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../dist')));

    // Catch all handler: send back React's index.html file for client-side routing
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../dist/index.html'));
    });
}

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
    logger.error({ err }, 'Unhandled application error');
    if (process.env.NODE_ENV !== 'production') {
        return res.status(500).json({ error: err.message, stack: err.stack });
    }
    res.status(500).json({ error: 'Internal Server Error' });
});

// Enhanced MongoDB connection with multiple URI fallbacks and better error handling
const connectWithRetry = async () => {
    const mongoURIs = [
        MONGO_URI,
        MONGO_URI.replace('mongodb+srv://', 'mongodb://'), // Fallback to standard MongoDB
        'mongodb://localhost:27017/medhelm' // Local fallback
    ];

    for (let i = 0; i < mongoURIs.length; i++) {
        const uri = mongoURIs[i];
        const uriForLogging = uri.replace(/:([^:@]{8})[^:@]*@/, ':***@'); // Hide password in logs

        logger.info(`Trying MongoDB URI ${i + 1}: ${uriForLogging}`);

        for (let attempt = 1; attempt <= 2; attempt++) {
            try {
                logger.info(`MongoDB connection attempt ${attempt} of 2 for URI ${i + 1}`);

                await mongoose.connect(uri, {
                    serverSelectionTimeoutMS: 5000, // 5 second timeout
                    socketTimeoutMS: 45000,
                    maxPoolSize: 10,
                    bufferCommands: false
                });

                logger.info(`Successfully connected to MongoDB using URI ${i + 1}`);
                return true;
            } catch (error) {
                logger.warn(`MongoDB connection attempt ${attempt} failed for URI ${i + 1}:`, error.message);
                if (attempt < 2) {
                    logger.info('Retrying in 3 seconds...');
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            }
        }
    }

    logger.error('Failed to connect to MongoDB after trying all URIs and retries');
    return false;
};

console.log('Connecting to MongoDB at', MONGO_URI.replace(/:([^:@]{8})[^:@]*@/, ':***@'));
let server;

connectWithRetry()
    .then((connected) => {
        if (connected) {
            logger.info('MongoDB connected successfully');
        } else {
            logger.warn('Starting server without MongoDB connection');
        }

        const attemptListen = (attemptsLeft = 5) => {
            server = app.listen(PORT)
                .once('listening', () => {
                    const status = mongoose.connection.readyState === 1 ? 'with MongoDB' : 'without MongoDB';
                    logger.info({ port: PORT }, `Server listening (${status})`);
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
        logger.error({ err }, 'Critical error during MongoDB connection');
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
