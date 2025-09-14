// Pesapal Configuration for Backend
const pesaPalConfig = {
    // API Configuration
    api: {
        baseUrl: process.env.PESAPAL_BASE_URL || 'https://pay.pesapal.com/v3',
        consumerKey: process.env.PESAPAL_CONSUMER_KEY,
        consumerSecret: process.env.PESAPAL_CONSUMER_SECRET
    },

    // Payment Configuration
    payment: {
        currency: 'KES',
        country: 'KE',
        callbackUrl: process.env.PESAPAL_CALLBACK_URL || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/checkout`,
        notificationUrl: process.env.PESAPAL_NOTIFICATION_URL || `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/v1/orders/pesapal-ipn`,
        redirectUrl: process.env.PESAPAL_REDIRECT_URL || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/complete`
    },

    // Order Configuration
    order: {
        defaultDescription: 'Medhelm Supplies Order',
        timeout: 3600, // 1 hour in seconds
        retries: 3
    },

    // Environment
    environment: process.env.NODE_ENV === 'production' ? 'live' : 'sandbox',

    // Validation helper
    validateConfig: function () {
        const errors = [];

        if (!this.api.consumerKey) {
            errors.push('PESAPAL_CONSUMER_KEY environment variable is required');
        }

        if (!this.api.consumerSecret) {
            errors.push('PESAPAL_CONSUMER_SECRET environment variable is required');
        }

        if (!this.api.baseUrl) {
            errors.push('PESAPAL_BASE_URL environment variable is required');
        }

        if (errors.length > 0) {
            console.error('Pesapal Configuration Errors:', errors);
            return false;
        }

        return true;
    }
};

// Validate configuration on load
pesaPalConfig.validateConfig();

module.exports = pesaPalConfig;
