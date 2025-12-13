import axios from 'axios';
import config from '../../config/environment.js';
import { PESAPAL_ENDPOINTS, PESAPAL_CURRENCY, PESAPAL_NOTIFICATION_TYPES, PESAPAL_ERROR_CODES, PESAPAL_BASE_URLS } from '../constants/pesapalConstants.js';

const logger = {
    info: console.log,
    error: console.error,
    warn: console.warn,
    debug: console.debug
};

const PESAPAL_BASE_URL = config.PESAPAL.TEST_MODE
    ? PESAPAL_BASE_URLS.SANDBOX
    : PESAPAL_BASE_URLS.PRODUCTION;
const CONSUMER_KEY = config.PESAPAL.CONSUMER_KEY;

async function getAccessToken(retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            logger.info(`Attempting PesaPal authentication (attempt ${i + 1}/${retries})`);

            if (!config.PESAPAL.CONSUMER_KEY || !config.PESAPAL.CONSUMER_SECRET) {
                logger.error('PesaPal credentials not configured');
                throw new Error('PesaPal credentials not configured. Please check environment variables.');
            }

            logger.info('Making request to:', `${PESAPAL_BASE_URL}${PESAPAL_ENDPOINTS.AUTH}`);
            logger.info('Using base URL:', PESAPAL_BASE_URL);

            const response = await axios.post(
                `${PESAPAL_BASE_URL}${PESAPAL_ENDPOINTS.AUTH}`,
                {
                    consumer_key: config.PESAPAL.CONSUMER_KEY,
                    consumer_secret: config.PESAPAL.CONSUMER_SECRET
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    timeout: 8000,
                    validateStatus: function (status) {
                        return status < 500;
                    }
                }
            );

            logger.info('PesaPal auth response status:', response.status);
            logger.info('PesaPal auth response data:', JSON.stringify(response.data, null, 2));

            if (response.data && (response.data.token || response.data.access_token)) {
                const token = response.data.token || response.data.access_token;
                logger.info('PesaPal authentication successful');
                return token;
            } else {
                logger.error('Invalid response format:', response.data);
                throw new Error('Invalid response format from PesaPal');
            }

        } catch (error) {
            const isLastAttempt = i === retries - 1;
            const errorMessage = error.response?.data || error.message;

            logger.error(`PesaPal authentication attempt ${i + 1} failed:`, {
                error: errorMessage,
                code: error.code,
                status: error.response?.status,
                url: error.config?.url
            });

            if (isLastAttempt) {
                if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
                    throw new Error('PesaPal servers are unreachable. Please check your internet connection or try again later.');
                } else if (error.response?.status === 401) {
                    throw new Error('Invalid PesaPal credentials. Please verify your Consumer Key and Secret.');
                } else if (error.response?.status >= 500) {
                    throw new Error('PesaPal servers are currently unavailable. Please try again later.');
                } else {
                    throw new Error(`PesaPal authentication failed: ${errorMessage}`);
                }
            } else {
                const delay = Math.pow(2, i) * 1000;
                logger.info(`Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
}

async function getIPNID(callbackUrl) {
    try {
        const token = await getAccessToken();
        const response = await axios.post(
            `${PESAPAL_BASE_URL}${PESAPAL_ENDPOINTS.REGISTER_IPN}`,
            {
                url: callbackUrl,
                ipn_notification_type: PESAPAL_NOTIFICATION_TYPES.GET
            },
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            }
        );

        if (response.data && response.data.ipn_id) {
            return response.data.ipn_id;
        } else {
            throw new Error('Invalid IPN registration response');
        }
    } catch (error) {
        logger.error('Failed to register IPN:', error.response?.data || error.message);
        throw new Error('Failed to register IPN with PesaPal');
    }
}

async function submitOrder(orderId, amount, description, callbackUrl, notificationId, email, phone) {
    try {
        const token = await getAccessToken();

        // Try to get IPN ID, but don't fail if it doesn't work
        let ipnId = null;
        try {
            ipnId = await getIPNID(callbackUrl);
            logger.info('IPN registered successfully:', ipnId);
        } catch (ipnError) {
            logger.warn('IPN registration failed, proceeding without IPN:', ipnError.message);
        }

        const orderData = {
            id: orderId,
            currency: PESAPAL_CURRENCY.KES,
            amount: amount,
            description: description,
            callback_url: callbackUrl,
            redirect_url: config.PESAPAL.REDIRECT_URL,
            cancel_url: config.PESAPAL.CANCEL_URL,
            ...(ipnId && { notification_id: ipnId }),
            billing_address: {
                email_address: email,
                phone_number: phone,
                country_code: 'KE',
                first_name: 'Customer',
                middle_name: '',
                last_name: 'User',
                line_1: '',
                line_2: '',
                city: '',
                state: '',
                zip: '',
                latitude: '',
                longitude: ''
            }
        };

        const response = await axios.post(
            `${PESAPAL_BASE_URL}${PESAPAL_ENDPOINTS.SUBMIT_ORDER}`,
            orderData,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                timeout: 8000
            }
        );

        logger.info('PesaPal order submission response:', JSON.stringify(response.data, null, 2));

        if (response.data.error) {
            const error = response.data.error;
            logger.error('PesaPal returned error:', error);

            if (error.code === PESAPAL_ERROR_CODES.AMOUNT_EXCEEDS_LIMIT) {
                throw new Error(`PAYMENT_LIMIT_EXCEEDED:Payment amount (KES ${amount.toLocaleString()}) exceeds your PesaPal account limit. Please contact our support team at support@Medhelmsupplies.co.ke or +254-XXX-XXXXXX to arrange alternative payment methods for large orders.`);
            } else {
                throw new Error(`PesaPal error: ${error.message || 'Unknown error'}`);
            }
        }

        if (!response.data.redirect_url) {
            throw new Error('PesaPal did not return a payment URL. Please try again.');
        }

        return {
            paymentUrl: response.data.redirect_url,
            orderTrackingId: response.data.order_tracking_id
        };
    } catch (error) {
        logger.error('Failed to submit PesaPal order:', error.response?.data || error.message);

        if (error.message.includes('account limit') || error.message.includes('PesaPal error:')) {
            throw error;
        }

        if (error.response?.status === 401) {
            throw new Error('PesaPal authentication failed. Please check credentials.');
        } else if (error.response?.status === 400) {
            throw new Error('Invalid payment request. Please check order details.');
        } else if (error.response?.status >= 500) {
            throw new Error('PesaPal service is currently unavailable. Please try again later.');
        } else {
            throw new Error('Failed to initiate PesaPal payment');
        }
    }
}

async function getTransactionStatus(orderTrackingId) {
    try {
        const token = await getAccessToken();

        const response = await axios.get(
            `${PESAPAL_BASE_URL}${PESAPAL_ENDPOINTS.GET_TRANSACTION_STATUS}`,
            {
                params: {
                    orderTrackingId: orderTrackingId
                },
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                },
                timeout: 15000
            }
        );

        logger.info('PesaPal transaction status response:', JSON.stringify(response.data, null, 2));

        return {
            status: response.data?.payment_status_description || response.data?.status || 'unknown',
            paymentMethod: response.data?.payment_method || 'unknown',
            amount: response.data?.amount || 0,
            currency: response.data?.currency || 'KES',
            transactionId: response.data?.confirmation_code || response.data?.transaction_id || orderTrackingId,
            paymentAccount: response.data?.payment_account || 'unknown',
            rawResponse: response.data
        };

    } catch (error) {
        logger.error('Failed to get transaction status:', error.response?.data || error.message);

        return {
            status: 'unknown',
            paymentMethod: 'unknown',
            amount: 0,
            currency: 'KES',
            transactionId: orderTrackingId,
            paymentAccount: 'unknown',
            error: error.message,
            rawResponse: null
        };
    }
}

async function queryPaymentStatus(orderId) {
    try {
        const token = await getAccessToken();

        const response = await axios.get(
            `${PESAPAL_BASE_URL}${PESAPAL_ENDPOINTS.QUERY_PAYMENT_STATUS}`,
            {
                params: {
                    orderId: orderId
                },
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                },
                timeout: 15000
            }
        );

        logger.info('PesaPal payment status query response:', JSON.stringify(response.data, null, 2));

        return response.data;

    } catch (error) {
        logger.error('Failed to query payment status:', error.response?.data || error.message);
        throw error;
    }
}

async function initiatePesapalPayment(orderId, amount, phone, email, description = 'Order Payment') {
    const callbackUrl = config.PESAPAL.CALLBACK_URL;

    try {
        return await submitOrder(orderId, amount, description, callbackUrl, null, email, phone);
    } catch (error) {
        // Fallback for development when PesaPal is unavailable
        if (process.env.NODE_ENV === 'development' && error.message.includes('PesaPal servers are currently unavailable')) {
            console.log('Development mode: Using mock payment due to PesaPal unavailability');
            return {
                paymentUrl: `http://localhost:5173/payment-success?orderId=${orderId}&mock=true`,
                orderTrackingId: `MOCK-${Date.now()}`
            };
        }
        throw error;
    }
}

export { initiatePesapalPayment, getAccessToken, getIPNID, submitOrder, getTransactionStatus, queryPaymentStatus };