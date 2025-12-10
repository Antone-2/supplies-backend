const Sentry = require('@sentry/node');
const { nodeProfilingIntegration } = require('@sentry/profiling-node');


const initSentry = () => {
    if (process.env.SENTRY_DSN && process.env.NODE_ENV) {
        Sentry.init({
            dsn: process.env.SENTRY_DSN,
            environment: process.env.NODE_ENV,
            integrations: [
                nodeProfilingIntegration(),
            ],

            tracesSampleRate: 1.0,

            profilesSampleRate: 1.0,
            beforeSend(event) {

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


const captureException = (error, context = {}) => {
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
            if (context.extra) {
                scope.setContext('extra', context.extra);
            }

            Sentry.captureException(error);
        });
    }


    console.error('Error captured:', error.message, context);
};


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


const sentryErrorHandler = Sentry.Handlers.errorHandler();


const sentryRequestHandler = Sentry.Handlers.requestHandler();

module.exports = {
    initSentry,
    captureException,
    captureMessage,
    sentryErrorHandler,
    sentryRequestHandler,
    Sentry
};