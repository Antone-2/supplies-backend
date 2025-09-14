const mongoose = require('mongoose');

const healthCheck = async () => {
    try {
        // Check database connection
        const dbState = mongoose.connection.readyState;
        const dbHealthy = dbState === 1; // 1 = connected

        // Check memory usage
        const memUsage = process.memoryUsage();
        const memHealthy = memUsage.heapUsed < memUsage.heapTotal * 0.9;

        // Check uptime
        const uptime = process.uptime();

        const health = {
            status: dbHealthy && memHealthy ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            uptime: `${Math.floor(uptime)}s`,
            database: {
                status: dbHealthy ? 'connected' : 'disconnected',
                state: dbState
            },
            memory: {
                used: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
                total: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
                healthy: memHealthy
            },
            version: process.env.npm_package_version || '1.0.0'
        };

        console.log('Health check:', JSON.stringify(health, null, 2));

        if (!dbHealthy || !memHealthy) {
            process.exit(1);
        }

        return health;
    } catch (error) {
        console.error('Health check failed:', error);
        process.exit(1);
    }
};

// Run health check if called directly
if (require.main === module) {
    healthCheck();
}

module.exports = healthCheck;
