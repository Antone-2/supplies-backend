// MongoDB Connection Diagnostic Tool
// This script will systematically test MongoDB connection and identify the exact issue

const mongoose = require('mongoose');
const dns = require('dns');
const { promisify } = require('util');
require('dotenv').config();

const dnsLookup = promisify(dns.lookup);

// Colors for console output
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

function log(level, message, data = '') {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] `;

    switch (level) {
        case 'error':
            console.error(`${colors.red}❌ ${prefix}${message}${colors.reset}`, data);
            break;
        case 'success':
            console.log(`${colors.green}✅ ${prefix}${message}${colors.reset}`, data);
            break;
        case 'warning':
            console.warn(`${colors.yellow}⚠️  ${prefix}${message}${colors.reset}`, data);
            break;
        case 'info':
            console.log(`${colors.blue}ℹ️  ${prefix}${message}${colors.reset}`, data);
            break;
        default:
            console.log(`${prefix}${message}`, data);
    }
}

async function runDiagnostics() {
    log('info', '🔍 Starting MongoDB Connection Diagnostics...');
    log('info', '='.repeat(60));

    // Step 1: Environment Variable Check
    log('info', '📋 Step 1: Checking Environment Variables');
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
        log('error', 'MONGO_URI environment variable not found!');
        return false;
    }

    log('success', 'MONGO_URI found:', mongoUri.replace(/:[^:@]*@/, ':***@'));

    // Step 2: Connection String Parsing
    log('info', '🔗 Step 2: Parsing Connection String');
    try {
        const url = new URL(mongoUri.replace('mongodb+srv://', 'https://'));
        log('success', 'Protocol: mongodb+srv://');
        log('success', 'Username:', url.username || 'NOT FOUND');
        log('success', 'Password:', url.password ? '***HIDDEN***' : 'NOT FOUND');
        log('success', 'Hostname:', url.hostname);
        log('success', 'Database:', url.pathname.substring(1) || 'NOT SPECIFIED');

        // Check for common issues
        if (!url.username) {
            log('error', 'Username is missing from connection string!');
            return false;
        }
        if (!url.password) {
            log('error', 'Password is missing from connection string!');
            return false;
        }

        // Step 3: DNS Resolution Test
        log('info', '🌐 Step 3: Testing DNS Resolution');
        try {
            const result = await dnsLookup(url.hostname);
            log('success', `DNS resolved ${url.hostname} to:`, result.address);
        } catch (dnsError) {
            log('error', 'DNS resolution failed:', dnsError.message);
            return false;
        }

    } catch (parseError) {
        log('error', 'Failed to parse connection string:', parseError.message);
        return false;
    }

    // Step 4: Network Connectivity Test
    log('info', '🔌 Step 4: Testing MongoDB Connection');

    const connectionTests = [
        {
            name: 'Primary URI (mongodb+srv://)',
            uri: mongoUri,
            timeout: 10000
        },
        {
            name: 'Fallback URI (mongodb://)',
            uri: mongoUri.replace('mongodb+srv://', 'mongodb://'),
            timeout: 10000
        },
        {
            name: 'Local fallback',
            uri: 'mongodb://localhost:27017/medhelm',
            timeout: 5000
        }
    ];

    for (const test of connectionTests) {
        log('info', `Testing: ${test.name}`);
        log('info', `URI: ${test.uri.replace(/:[^:@]*@/, ':***@')}`);

        try {
            // Create a new mongoose instance for each test
            const testConnection = mongoose.createConnection();

            // Set up timeout
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Connection timeout')), test.timeout);
            });

            // Test connection with timeout
            await Promise.race([
                testConnection.openUri(test.uri, {
                    serverSelectionTimeoutMS: test.timeout,
                    socketTimeoutMS: test.timeout,
                    connectTimeoutMS: test.timeout,
                    maxPoolSize: 1,
                    bufferCommands: false
                }),
                timeoutPromise
            ]);

            log('success', `${test.name} - Connection successful!`);

            // Test a simple operation
            try {
                const collections = await testConnection.db.listCollections().toArray();
                log('success', 'Database accessible, collections:', collections.map(c => c.name).join(', ') || 'none');
            } catch (opError) {
                log('warning', 'Connected but database operation failed:', opError.message);
            }

            await testConnection.close();
            return true;

        } catch (error) {
            log('error', `${test.name} - Connection failed:`, error.message);

            // Detailed error analysis
            if (error.message.includes('authentication failed')) {
                log('error', '🔐 AUTHENTICATION ISSUE: Check username/password');
            } else if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
                log('error', '🌐 DNS ISSUE: Cannot resolve hostname');
            } else if (error.message.includes('ECONNREFUSED')) {
                log('error', '🔌 CONNECTION REFUSED: Service not reachable');
            } else if (error.message.includes('timeout')) {
                log('error', '⏰ TIMEOUT: Connection taking too long');
            } else if (error.message.includes('IP not in whitelist') || error.message.includes('not authorized')) {
                log('error', '🚫 IP WHITELIST ISSUE: Your IP might not be allowed');
            }
        }
    }

    return false;
}

// Step 5: Additional Diagnostics
async function additionalDiagnostics() {
    log('info', '🔧 Step 5: Additional System Diagnostics');

    // Check Node.js version
    log('info', 'Node.js version:', process.version);

    // Check Mongoose version
    try {
        log('info', 'Mongoose version:', mongoose.version);
    } catch (e) {
        log('warning', 'Could not determine Mongoose version');
    }

    // Check system time (important for authentication)
    log('info', 'System time:', new Date().toISOString());

    // Memory usage
    const memUsage = process.memoryUsage();
    log('info', 'Memory usage:', {
        heap: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`
    });
}

async function main() {
    try {
        const connectionSuccess = await runDiagnostics();
        await additionalDiagnostics();

        log('info', '='.repeat(60));
        if (connectionSuccess) {
            log('success', '🎉 Diagnostics completed - MongoDB connection working!');
            process.exit(0);
        } else {
            log('error', '💥 Diagnostics completed - MongoDB connection failed!');
            log('info', '📝 Recommendations:');
            log('info', '1. Check MongoDB Atlas dashboard - ensure cluster is active');
            log('info', '2. Verify Network Access in Atlas - ensure your IP is whitelisted');
            log('info', '3. Check Database Access - verify user credentials');
            log('info', '4. Try using MongoDB Compass with the same connection string');
            process.exit(1);
        }
    } catch (error) {
        log('error', 'Diagnostic script failed:', error.message);
        process.exit(1);
    }
}

// Run diagnostics
main();