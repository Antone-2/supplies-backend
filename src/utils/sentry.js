const Sentry = require('@sentry/node');
const { nodeProfilingIntegration } = require('@sentry/profiling-node');

// Initialize Sentry
const initSentry = () => {
    if (process.env.SENTRY_DSN && process.env.NODE_ENV) {
        Sentry.init({
            dsn: process.env.SENTRY_DSN,
            environment: process.env.NODE_ENV,
            integrations: [
                nodeProfilingIntegration(),
            ],
            // Performance Monitoring
            tracesSampleRate: 1.0,
            // Profiling
            profilesSampleRate: 1.0,
            beforeSend(event) {
                // Filter out sensitive information
                if (event.request) {
                    delete event.request.cookies;
                    if (event.request.headers) {
                        delete event.request.headers.authorization;
                        delete event.request.headers.cookie;
                    }
                }
                return event;
            }
        });

        console.log('Sentry monitoring initialized');
    } else {
        console.log('Sentry monitoring disabled (no DSN or development mode)');
    }
};

// Capture exception with context
const captureException = (error, context = {}) => {
    if (process.env.SENTRY_DSN) {
        Sentry.withScope(scope => {
            // Add context
            if (context.user) {
                scope.setUser({ id: context.user.id, email: context.user.email });
            }
            if (context.tags) {
                Object.keys(context.tags).forEach(key => {
                    scope.setTag(key, context.tags[key]);
                });
            }
            if (context.extra) {
                scope.setContext('extra', context.extra);
            }

            Sentry.captureException(error);
        });
    }

    // Always log locally as well
    console.error('Error captured:', error.message, context);
};

// Capture custom message
const captureMessage = (message, level = 'info', context = {}) => {
    if (process.env.SENTRY_DSN) {
        Sentry.withScope(scope => {
            if (context.user) {
                scope.setUser({ id: context.user.id, email: context.user.email });
            }
            if (context.tags) {
                Object.keys(context.tags).forEach(key => {
                    scope.setTag(key, context.tags[key]);
                });
            }

            Sentry.captureMessage(message, level);
        });
    }
};

// Express error handler for Sentry
const sentryErrorHandler = Sentry.Handlers.errorHandler();

// Express request handler for Sentry
const sentryRequestHandler = Sentry.Handlers.requestHandler();

module.exports = {
    initSentry,
    captureException,
    captureMessage,
    sentryErrorHandler,
    sentryRequestHandler,
    Sentry
};