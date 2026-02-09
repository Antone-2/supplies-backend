export const PESAPAL_BASE_URLS = {
    PRODUCTION: 'https://pay.pesapal.com/v3',
    SANDBOX: 'https://cybqa.pesapal.com/v3'
};


export const PESAPAL_ENDPOINTS = {
    AUTH: '/api/Auth/RequestToken',
    SUBMIT_ORDER: '/api/Transactions/SubmitOrderRequest',
    REGISTER_IPN: '/api/URLSetup/RegisterIPN',
    GET_TRANSACTION_STATUS: '/api/Transactions/GetTransactionStatus',
    QUERY_PAYMENT_STATUS: '/api/Transactions/QueryPaymentStatus'
};


export const PESAPAL_STATUS = {
    SUCCESS: 'success',
    FAILED: 'failed',
    PENDING: 'pending'
};


export const PESAPAL_ERROR_CODES = {
    AMOUNT_EXCEEDS_LIMIT: 'amount_exceeds_default_limit',
    INVALID_CREDENTIALS: 'invalid_credentials',
    INVALID_REQUEST: 'invalid_request'
};


export const PESAPAL_CURRENCY = {
    KES: 'KES',
    USD: 'USD',
    EUR: 'EUR'
};


export const PESAPAL_NOTIFICATION_TYPES = {
    GET: 'GET',
    POST: 'POST'
};
