// PesaPal API base URLs
export const PESAPAL_BASE_URLS = {
    PRODUCTION: 'https://pay.pesapal.com/v3',
    SANDBOX: 'https://cybqa.pesapal.com/v3'
};

// PesaPal API endpoints (v3)
export const PESAPAL_ENDPOINTS = {
    AUTH: '/api/Auth/RequestToken',
    SUBMIT_ORDER: '/api/Transactions/SubmitOrderRequest',
    REGISTER_IPN: '/api/URLSetup/RegisterIPN'
};

// PesaPal API response status codes
export const PESAPAL_STATUS = {
    SUCCESS: 'success',
    FAILED: 'failed',
    PENDING: 'pending'
};

// PesaPal error codes
export const PESAPAL_ERROR_CODES = {
    AMOUNT_EXCEEDS_LIMIT: 'amount_exceeds_default_limit',
    INVALID_CREDENTIALS: 'invalid_credentials',
    INVALID_REQUEST: 'invalid_request'
};

// PesaPal currency codes
export const PESAPAL_CURRENCY = {
    KES: 'KES',
    USD: 'USD',
    EUR: 'EUR'
};

// PesaPal notification types
export const PESAPAL_NOTIFICATION_TYPES = {
    GET: 'GET',
    POST: 'POST'
};
