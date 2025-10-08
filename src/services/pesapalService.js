const axios = require('axios');
const config = require('../../config/environment');

// Use console for logging since utils/logger doesn't exist
const logger = {
    info: console.log,
    error: console.error,
    warn: console.warn,
    debug: console.debug
};

const PESAPAL_BASE_URL = config.PESAPAL.BASE_URL;
const CONSUMER_KEY = config.PESAPAL.CONSUMER_KEY;
const CONSUMER_SECRET = config.PESAPAL.CONSUMER_SECRET;

// Get OAuth token with retry mechanism
async function getAccessToken(retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            logger.info(`Attempting PesaPal authentication (attempt ${i + 1}/${retries})`);

            const response = await axios.post(
                `${PESAPAL_BASE_URL}/Auth/RequestToken`,
                {
                    consumer_key: CONSUMER_KEY,
                    consumer_secret: CONSUMER_SECRET
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    timeout: 10000, // 10 second timeout
                    validateStatus: function (status) {
                        return status < 500; // Resolve only if status is less than 500
                    }
                }
            );

            if (response.data && (response.data.token || response.data.access_token)) {
                const token = response.data.token || response.data.access_token;
                logger.info('✅ PesaPal authentication successful');
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
                status: error.response?.status
            });

            if (isLastAttempt) {
                // On final failure, throw detailed error
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
                // Wait before retry (exponential backoff)
                const delay = Math.pow(2, i) * 1000;
                logger.info(`Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
}

// Get IPN Notification ID
async function getIPNID(callbackUrl) {
    try {
        const token = await getAccessToken();
        const response = await axios.post(
            `${PESAPAL_BASE_URL}/URLSetup/RegisterIPN`,
            {
                url: callbackUrl,
                ipn_notification_type: "GET"
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

// Submit order and get payment URL
async function submitOrder(orderId, amount, description, callbackUrl, notificationId, email, phone) {
    try {
        const token = await getAccessToken();

        // Try to get IPN ID, but continue without it if it fails
        let ipnId = '';
        try {
            ipnId = await getIPNID(callbackUrl);
        } catch (ipnError) {
            logger.warn('IPN registration failed, continuing without it:', ipnError.message);
        }

        const orderData = {
            id: orderId,
            currency: 'KES',
            amount: amount,
            description: description,
            callback_url: callbackUrl,
            redirect_url: config.PESAPAL.REDIRECT_URL,
            cancel_url: config.PESAPAL.CANCEL_URL,
            ...(ipnId && { notification_id: ipnId }), // Only include if IPN registration succeeded
            billing_address: {
                email_address: email,
                phone_number: phone,
                country_code: 'KE',
                first_name: 'Customer', // Can be dynamic
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
            `${PESAPAL_BASE_URL}/Transactions/SubmitOrderRequest`,
            orderData,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            }
        );

        logger.info('PesaPal order submission response:', JSON.stringify(response.data, null, 2));

        // Check if PesaPal returned an error in the response
        if (response.data.error) {
            const error = response.data.error;
            logger.error('PesaPal returned error:', error);

            // Handle specific PesaPal error types
            if (error.code === 'amount_exceeds_default_limit') {
                throw new Error(`Payment amount exceeds your PesaPal account limit. ${error.message}`);
            } else {
                throw new Error(`PesaPal error: ${error.message || 'Unknown error'}`);
            }
        }

        // Check if we have the required fields for successful payment
        if (!response.data.redirect_url) {
            throw new Error('PesaPal did not return a payment URL. Please try again.');
        }

        return {
            paymentUrl: response.data.redirect_url,
            orderTrackingId: response.data.order_tracking_id
        };
    } catch (error) {
        logger.error('Failed to submit PesaPal order:', error.response?.data || error.message);

        // If this is already a specific error we threw (like limit error), preserve it
        if (error.message.includes('account limit') || error.message.includes('PesaPal error:')) {
            throw error;
        }

        // Provide more specific error messages for HTTP errors
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

// Main initiation function
async function initiatePesapalPayment(orderId, amount, phone, email, description = 'Order Payment') {
    const callbackUrl = config.PESAPAL.CALLBACK_URL;
    return await submitOrder(orderId, amount, description, callbackUrl, null, email, phone);
}

module.exports = { initiatePesapalPayment, getAccessToken, getIPNID, submitOrder };
