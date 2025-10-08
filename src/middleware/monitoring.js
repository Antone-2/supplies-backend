/**
 * Production monitoring and metrics collection
 * Provides comprehensive application monitoring and alerting
 */

const config = require('../../config/environment');

// Metrics storage (in production, use Redis or external metrics store)
const metrics = {
    requests: {
        total: 0,
        successful: 0,
        errors: 0,
        byEndpoint: {},
        byStatusCode: {},
        responseTimeSum: 0,
        responseTimeCount: 0
    },
    authentication: {
        logins: 0,
        failures: 0,
        registrations: 0
    },
    payments: {
        initiated: 0,
        successful: 0,
        failed: 0,
        totalAmount: 0
    },
    errors: {
        total: 0,
        byType: {},
        recent: []
    },
    system: {
        startTime: Date.now(),
        lastHealthCheck: null,
        alerts: []
    }
};

/**
 * Request metrics middleware
 */
const requestMetrics = (req, res, next) => {
    const startTime = Date.now();

    // Track request
    metrics.requests.total++;

    // Track by endpoint
    const endpoint = req.route?.path || req.path;
    metrics.requests.byEndpoint[endpoint] = (metrics.requests.byEndpoint[endpoint] || 0) + 1;

    // Override res.end to capture response metrics
    const originalEnd = res.end;
    res.end = function (...args) {
        const responseTime = Date.now() - startTime;

        // Track response time
        metrics.requests.responseTimeSum += responseTime;
        metrics.requests.responseTimeCount++;

        // Track status codes
        const statusCode = res.statusCode;
        metrics.requests.byStatusCode[statusCode] = (metrics.requests.byStatusCode[statusCode] || 0) + 1;

        // Track success/error
        if (statusCode >= 200 && statusCode < 400) {
            metrics.requests.successful++;
        } else {
            metrics.requests.errors++;
        }

        // Track slow requests
        if (responseTime > 5000) {
            recordAlert('slow_request', {
                endpoint: req.path,
                method: req.method,
                responseTime,
                ip: req.ip
            });
        }

        originalEnd.apply(this, args);
    };

    next();
};

/**
 * Authentication metrics tracking
 */
const trackAuthentication = {
    login: (success = false) => {
        if (success) {
            metrics.authentication.logins++;
        } else {
            metrics.authentication.failures++;

            // Alert on high failure rate
            const recentFailures = metrics.authentication.failures;
            const recentLogins = metrics.authentication.logins;
            const failureRate = recentFailures / (recentFailures + recentLogins);

            if (failureRate > 0.5 && recentFailures > 10) {
                recordAlert('high_auth_failure_rate', { failureRate, totalFailures: recentFailures });
            }
        }
    },

    register: () => {
        metrics.authentication.registrations++;
    }
};

/**
 * Payment metrics tracking
 */
const trackPayment = {
    initiated: (amount) => {
        metrics.payments.initiated++;
        metrics.payments.totalAmount += parseFloat(amount) || 0;
    },

    completed: (amount) => {
        metrics.payments.successful++;
    },

    failed: (amount, reason) => {
        metrics.payments.failed++;

        // Alert on high payment failure rate
        const failureRate = metrics.payments.failed / metrics.payments.initiated;
        if (failureRate > 0.3 && metrics.payments.initiated > 5) {
            recordAlert('high_payment_failure_rate', {
                failureRate,
                totalFailed: metrics.payments.failed,
                totalInitiated: metrics.payments.initiated,
                reason
            });
        }
    }
};

/**
 * Error tracking
 */
const trackError = (error, context = {}) => {
    metrics.errors.total++;

    const errorType = error.name || 'Unknown';
    metrics.errors.byType[errorType] = (metrics.errors.byType[errorType] || 0) + 1;

    // Keep recent errors (last 100)
    const errorEntry = {
        timestamp: new Date().toISOString(),
        message: error.message,
        type: errorType,
        stack: config.NODE_ENV ? error.stack : undefined,
        context
    };

    metrics.errors.recent.unshift(errorEntry);
    if (metrics.errors.recent.length > 100) {
        metrics.errors.recent.pop();
    }

    // Alert on error spikes
    const recentErrors = metrics.errors.recent.filter(e =>
        Date.now() - new Date(e.timestamp).getTime() < 300000 // Last 5 minutes
    ).length;

    if (recentErrors > 10) {
        recordAlert('error_spike', { errorCount: recentErrors, latestError: error.message });
    }
};

/**
 * System alerts
 */
const recordAlert = (type, data) => {
    const alert = {
        type,
        timestamp: new Date().toISOString(),
        data,
        id: Date.now().toString()
    };

    metrics.system.alerts.unshift(alert);

    // Keep only last 50 alerts
    if (metrics.system.alerts.length > 50) {
        metrics.system.alerts.pop();
    }

    // Log alert
    console.warn(`[ALERT] ${type}:`, data);

    // In production, send to external alerting system
    if (config.NODE_ENV === 'production') {
        sendAlert(alert);
    }
};

/**
 * Send alert to external system (Slack, Email, PagerDuty, etc.)
 */
const sendAlert = async (alert) => {
    try {
        // Implement your alerting logic here
        // Examples:
        // - Send to Slack webhook
        // - Send email via Brevo
        // - Send to PagerDuty
        // - Send to Discord webhook

        console.log('Alert would be sent to external system:', alert);
    } catch (error) {
        console.error('Failed to send alert:', error);
    }
};

/**
 * Health monitoring
 */
const monitorHealth = () => {
    setInterval(async () => {
        try {
            const memUsage = process.memoryUsage();
            const memPercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;

            // Memory usage alert - only in production
            if (config.NODE_ENV) {
                const memoryThreshold = 85;
                if (memPercentage > memoryThreshold) {
                    recordAlert('high_memory_usage', {
                        percentage: memPercentage.toFixed(2),
                        used: Math.round(memUsage.heapUsed / 1024 / 1024),
                        total: Math.round(memUsage.heapTotal / 1024 / 1024),
                        threshold: memoryThreshold
                    });
                }
            }

            // Update last health check
            metrics.system.lastHealthCheck = new Date().toISOString();

        } catch (error) {
            console.error('Health monitoring error:', error);
        }
    }, 60000); // Check every minute
};

/**
 * Get metrics summary
 */
const getMetrics = () => {
    const uptime = Date.now() - metrics.system.startTime;
    const avgResponseTime = metrics.requests.responseTimeCount > 0
        ? (metrics.requests.responseTimeSum / metrics.requests.responseTimeCount).toFixed(2)
        : 0;

    return {
        timestamp: new Date().toISOString(),
        uptime: Math.floor(uptime / 1000),
        requests: {
            ...metrics.requests,
            averageResponseTime: `${avgResponseTime}ms`,
            successRate: metrics.requests.total > 0
                ? ((metrics.requests.successful / metrics.requests.total) * 100).toFixed(2) + '%'
                : '0%'
        },
        authentication: metrics.authentication,
        payments: {
            ...metrics.payments,
            successRate: metrics.payments.initiated > 0
                ? ((metrics.payments.successful / metrics.payments.initiated) * 100).toFixed(2) + '%'
                : '0%',
            averageAmount: metrics.payments.initiated > 0
                ? (metrics.payments.totalAmount / metrics.payments.initiated).toFixed(2)
                : 0
        },
        errors: {
            total: metrics.errors.total,
            byType: metrics.errors.byType,
            recentCount: metrics.errors.recent.length
        },
        alerts: {
            total: metrics.system.alerts.length,
            recent: metrics.system.alerts.slice(0, 5) // Last 5 alerts
        }
    };
};

/**
 * Reset metrics (useful for testing or periodic resets)
 */
const resetMetrics = () => {
    metrics.requests = {
        total: 0,
        successful: 0,
        errors: 0,
        byEndpoint: {},
        byStatusCode: {},
        responseTimeSum: 0,
        responseTimeCount: 0
    };
    metrics.authentication = { logins: 0, failures: 0, registrations: 0 };
    metrics.payments = { initiated: 0, successful: 0, failed: 0, totalAmount: 0 };
    metrics.errors = { total: 0, byType: {}, recent: [] };
    metrics.system.alerts = [];
};

// Start health monitoring
if (config.NODE_ENV !== 'test') {
    monitorHealth();
}

module.exports = {
    requestMetrics,
    trackAuthentication,
    trackPayment,
    trackError,
    recordAlert,
    getMetrics,
    resetMetrics
};