const axios = require('axios');
const { initiatePesapalPayment, getAccessToken } = require('../../services/pesapalService');
const Order = require('../../../Database/models/order.model');
const console = require('console'); // Use console for logging

const { validatePesapalPayment } = require('./payment.validation');

// Normalize Kenyan phone numbers to +254 format
function normalizeKenyanPhone(phone) {
    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');

    // Handle different formats
    if (cleaned.startsWith('+254')) {
        return cleaned; // Already in correct format
    } else if (cleaned.startsWith('254')) {
        return '+' + cleaned;
    } else if (cleaned.startsWith('0')) {
        return '+254' + cleaned.substring(1);
    } else if (cleaned.length === 9) {
        return '+254' + cleaned;
    }

    // If none of the above, assume it's missing country code
    return '+254' + cleaned;
}

// Create PesaPal payment
exports.createPesapalPayment = async (req, res) => {
    const startTime = Date.now();
    let orderId = req.body?.orderId;

    try {
        const { error, value } = validatePesapalPayment(req.body);
        if (error) {
            console.warn('Payment validation failed:', error.details[0].message);
            return res.status(400).json({ success: false, message: `Validation error: ${error.details[0].message}` });
        }

        let { orderId: validatedOrderId, amount, phone, email, description = 'Order Payment' } = value;

        // Normalize phone number to +254 format
        phone = normalizeKenyanPhone(phone);
        orderId = validatedOrderId;

        // Check if order exists and is in valid state
        const order = await Order.findOne({ orderNumber: orderId });
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        if (order.paymentStatus === 'paid') {
            return res.status(400).json({ success: false, message: 'Order is already paid' });
        }
        if (order.paymentStatus === 'processing') {
            return res.status(409).json({ success: false, message: 'Payment is already being processed' });
        }

        // Update order status to pending
        await Order.findOneAndUpdate(
            { orderNumber: orderId },
            {
                paymentStatus: 'pending',
                paymentInitiatedAt: new Date()
            }
        );

        // Initiate PesaPal payment
        const result = await initiatePesapalPayment(orderId, amount, phone, email, description);

        // Update order with payment tracking info
        await Order.findOneAndUpdate(
            { orderNumber: orderId },
            {
                paymentStatus: 'processing',
                paymentTrackingId: result.orderTrackingId,
                paymentInitiatedAt: new Date()
            }
        );

        // Log successful payment initiation
        console.log(`✅ PesaPal payment initiated for order ${orderId}:`, {
            orderTrackingId: result.orderTrackingId,
            amount: amount,
            email: email,
            duration: Date.now() - startTime + 'ms'
        });

        res.json({
            success: true,
            message: 'PesaPal payment initiated successfully',
            paymentUrl: result.paymentUrl,
            orderTrackingId: result.orderTrackingId
        });
    } catch (err) {
        const duration = Date.now() - startTime;
        console.error('❌ Payment initiation failed:', {
            orderId,
            error: err.message,
            stack: err.stack,
            duration: duration + 'ms',
            timestamp: new Date().toISOString()
        });

        // Update order status to failed
        if (orderId) {
            try {
                await Order.findOneAndUpdate(
                    { orderNumber: orderId },
                    {
                        paymentStatus: 'failed',
                        paymentError: err.message,
                        paymentFailedAt: new Date()
                    }
                );
            } catch (updateError) {
                console.error('Failed to update order status on error:', updateError.message);
            }
        }

        // Return user-friendly error messages
        let userMessage = 'Payment initiation failed. Please try again.';
        let statusCode = 500;

        if (err.message.includes('timeout')) {
            userMessage = 'Payment service is taking too long. Please try again.';
            statusCode = 504;
        } else if (err.message.includes('unreachable') || err.message.includes('ENOTFOUND')) {
            userMessage = 'Payment service is currently unavailable. Please try again in a few minutes.';
            statusCode = 503;
        } else if (err.message.includes('credentials') || err.message.includes('Invalid')) {
            userMessage = 'Payment configuration error. Please contact support.';
            statusCode = 500;
        } else if (err.message.includes('Order not found')) {
            userMessage = err.message;
            statusCode = 404;
        } else if (err.message.includes('already paid') || err.message.includes('already being processed')) {
            userMessage = err.message;
            statusCode = 409;
        } else if (err.message.includes('exceeds') && err.message.includes('limit')) {
            userMessage = 'Payment amount exceeds the allowed limit. Please try a smaller amount or contact support.';
            statusCode = 400;
        } else if (err.message.includes('Failed to initiate PesaPal payment') || err.message.includes('account limit')) {
            userMessage = 'Payment amount exceeds the allowed limit. Please try a smaller amount or contact support.';
            statusCode = 400;
        }

        res.status(statusCode).json({
            success: false,
            message: userMessage,
            error: process.env.NODE_ENV ? err.message : undefined
        });
    }
};

// M-Pesa payment (mock for local testing; implement full Daraja API later)
exports.payWithMpesa = async (req, res) => {
    try {
        const { phone, amount, orderId } = req.body;
        if (!phone || !amount || !orderId) {
            return res.status(400).json({ success: false, message: 'Missing required fields: phone, amount, orderId' });
        }

        // Update order status to pending
        await Order.findOneAndUpdate({ orderNumber: orderId }, { paymentStatus: 'pending' });

        // Mock STK push response
        res.json({
            success: true,
            message: 'M-Pesa STK push initiated (mock for local testing)',
            checkoutRequestID: `ws_CO_${Date.now()}`,
            orderId
        });
    } catch (err) {
        console.error('M-Pesa payment error:', err.message);
        res.status(500).json({ success: false, message: 'M-Pesa payment failed' });
    }
};

// Airtel Money payment (mock)
exports.payWithAirtel = async (req, res) => {
    try {
        const { phone, amount, orderId } = req.body;
        if (!phone || !amount || !orderId) {
            return res.status(400).json({ success: false, message: 'Missing required fields: phone, amount, orderId' });
        }

        // Update order status to pending
        await Order.findOneAndUpdate({ orderNumber: orderId }, { paymentStatus: 'pending' });

        res.json({
            success: true,
            message: 'Airtel Money payment initiated (mock)',
            transactionId: `airtel_${Date.now()}`,
            orderId
        });
    } catch (err) {
        console.error('Airtel payment error:', err.message);
        res.status(500).json({ success: false, message: 'Airtel Money payment failed' });
    }
};

// PayPal payment (mock)
exports.payWithPaypal = async (req, res) => {
    try {
        const { orderId, amount, email } = req.body;
        if (!orderId || !amount || !email) {
            return res.status(400).json({ success: false, message: 'Missing required fields: orderId, amount, email' });
        }

        // Update order status to pending
        await Order.findOneAndUpdate({ orderNumber: orderId }, { paymentStatus: 'pending' });

        res.json({
            success: true,
            message: 'PayPal payment initiated (mock)',
            approvalUrl: `https://www.sandbox.paypal.com/cgi-bin/webscr?cmd=_express-checkout&token=EC-${Date.now()}`,
            orderId
        });
    } catch (err) {
        console.error('PayPal payment error:', err.message);
        res.status(500).json({ success: false, message: 'PayPal payment failed' });
    }
};

// Payment callback/IPN handler for PesaPal
exports.paymentCallback = async (req, res) => {
    try {
        // PesaPal IPN is typically form data, so use req.body or req.query
        const { pesapal_transaction_tracking_id: orderTrackingId, pesapal_merchant_reference: orderId } = req.body || req.query;

        if (!orderTrackingId || !orderId) {
            return res.status(400).send('<script>window.opener.postMessage("pesapal-payment-failed", "*");window.close();</script>');
        }

        // Get access token
        const token = await getAccessToken();

        // Get transaction status
        const baseUrl = process.env.PESAPAL_TEST_MODE === 'true'
            ? (process.env.PESAPAL_SANDBOX_URL)
            : (process.env.PESAPAL_PRODUCTION_URL);
        const response = await axios.get(
            `${baseUrl}/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            }
        );

        const transactionStatus = response.data.payment_status_description; // e.g., 'COMPLETED', 'FAILED'

        // Update order status
        let paymentStatus = 'failed';
        let message = 'pesapal-payment-failed';
        if (transactionStatus === 'COMPLETED') {
            paymentStatus = 'paid';
            message = 'pesapal-payment-success';
        } else if (transactionStatus === 'PENDING') {
            paymentStatus = 'pending';
            message = 'pesapal-payment-pending';
        }

        await Order.findOneAndUpdate({ orderNumber: orderId }, {
            paymentStatus,
            transactionStatus: transactionStatus
        });

        console.log(`Payment callback for order ${orderId}: Status updated to ${paymentStatus}`);

        // Respond with script to close tab and notify opener
        res.status(200).send(`<script>window.opener.postMessage("${message}", "*");window.close();</script>`);
    } catch (err) {
        console.error('Payment callback error:', err.message);
        res.status(500).send('<script>window.opener.postMessage("pesapal-payment-failed", "*");window.close();</script>');
    }
};

// Get payment status for an order
exports.getPaymentStatus = async (req, res) => {
    try {
        const { orderId } = req.params;

        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: 'Order ID is required'
            });
        }

        const order = await Order.findOne({ orderNumber: orderId });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.json({
            success: true,
            data: {
                orderId: order.orderNumber,
                paymentStatus: order.paymentStatus,
                transactionStatus: order.transactionStatus,
                paymentTrackingId: order.paymentTrackingId,
                totalAmount: order.totalAmount,
                paymentInitiatedAt: order.paymentInitiatedAt,
                updatedAt: order.updatedAt
            }
        });
    } catch (error) {
        console.error('Get payment status error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve payment status'
        });
    }
};
