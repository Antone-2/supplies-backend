import pino from 'pino';
import pinoHttp from 'pino-http';


const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV ? {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname'
        }
    } : undefined,
    formatters: {
        level: (label) => {
            return { level: label };
        }
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: ['req.headers.authorization', 'password', 'token']
});


const httpLogger = pinoHttp({
    logger,
    serializers: {
        req: (req) => ({
            method: req.method,
            url: req.url,
            userAgent: req.headers['user-agent'],
            ip: req.ip || req.connection.remoteAddress,
            userId: req.user?.id
        }),
        res: (res) => ({
            statusCode: res.statusCode
        })
    },
    customLogLevel: function (req, res, err) {
        if (res.statusCode >= 400 && res.statusCode < 500) {
            return 'warn';
        } else if (res.statusCode >= 500 || err) {
            return 'error';
        } else if (res.statusCode >= 300 && res.statusCode < 400) {
            return 'silent';
        }
        return 'info';
    }
});


const logSecurityEvent = (event, details, req) => {
    logger.warn({
        type: 'SECURITY_EVENT',
        event,
        details,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        userId: req.user?.id,
        url: req.originalUrl,
        method: req.method
    });
};


const logBusinessEvent = (event, details, userId) => {
    logger.info({
        type: 'BUSINESS_EVENT',
        event,
        details,
        userId
    });
};


const logError = (error, context = {}) => {
    logger.error({
        type: 'APPLICATION_ERROR',
        error: {
            message: error.message,
            stack: error.stack,
            name: error.name
        },
        context
    });
};


export {
    logger,
    httpLogger,
    logSecurityEvent,
    logBusinessEvent,
    logError
};
