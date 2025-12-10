import SibApiV3Sdk from 'sib-api-v3-sdk';
import config from '../../config/environment.js';


const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = config.EMAIL.BREVO_API_KEY;


const sendSMS = async (phoneNumber, message) => {
    try {

        if (!process.env.BREVO_API_KEY ||
            process.env.BREVO_API_KEY.includes('xyz')) {
            console.log('️ Brevo API key not configured for SMS');
            return { success: false, error: 'SMS service not configured' };
        }

        console.log(' Attempting to send SMS via Brevo to:', phoneNumber);

        const apiInstance = new SibApiV3Sdk.TransactionalSMSApi();
        const sendTransacSms = new SibApiV3Sdk.SendTransacSms();

        sendTransacSms.sender = process.env.SMS_SENDER || 'Medhelm';
        sendTransacSms.recipient = phoneNumber;
        sendTransacSms.content = message;
        sendTransacSms.type = 'transactional';

        const result = await apiInstance.sendTransacSms(sendTransacSms);
        console.log(' SMS sent successfully via Brevo:', result);

        return {
            success: true,
            provider: 'brevo',
            messageId: result.messageId,
            cost: result.cost
        };

    } catch (error) {
        console.error(' Brevo SMS failed:', error.message, error.response?.body);


        if (process.env.NODE_ENV === 'development') {
            console.log(' SMS (Development Mode):');
            console.log(`To: ${phoneNumber}`);
            console.log(`Message: ${message}`);
            return { success: true, provider: 'development-log' };
        }

        return {
            success: false,
            error: error.message,
            provider: 'brevo'
        };
    }
};


const sendOrderConfirmationSMS = async (phoneNumber, orderData) => {
    const { name, orderId, totalAmount } = orderData;

    const message = `Hi ${name}, your order ${orderId} for KES ${totalAmount.toLocaleString()} has been confirmed. We'll send updates soon. - Medhelm Supplies`;

    return await sendSMS(phoneNumber, message);
};

// Payment confirmation SMS
const sendPaymentConfirmationSMS = async (phoneNumber, orderData) => {
    const { name, orderId, totalAmount, trackingNumber } = orderData;

    const message = `Hi ${name}, payment of KES ${totalAmount.toLocaleString()} for order ${orderId} confirmed${trackingNumber ? `. Tracking: ${trackingNumber}` : ''}. Your order is being prepared. - Medhelm Supplies`;

    return await sendSMS(phoneNumber, message);
};

// Shipping notification SMS
const sendShippingNotificationSMS = async (phoneNumber, orderData) => {
    const { name, orderId, trackingNumber } = orderData;

    const message = `Hi ${name}, your order ${orderId} has shipped${trackingNumber ? ` (Tracking: ${trackingNumber})` : ''}. Expected delivery: 2-3 days. - Medhelm Supplies`;

    return await sendSMS(phoneNumber, message);
};

// Delivery notification SMS
const sendDeliveryNotificationSMS = async (phoneNumber, orderData) => {
    const { name, orderId } = orderData;

    const message = `Hi ${name}, your order ${orderId} has been delivered successfully. Thank you for shopping with Medhelm Supplies!`;

    return await sendSMS(phoneNumber, message);
};

// Order status update SMS
const sendOrderStatusUpdateSMS = async (phoneNumber, orderData) => {
    const { name, orderId, status } = orderData;

    const statusMessages = {
        'processing': 'is being processed',
        'shipped': 'has been shipped',
        'delivered': 'has been delivered',
        'cancelled': 'has been cancelled',
        'refunded': 'has been refunded'
    };

    const message = `Hi ${name}, your order ${orderId} ${statusMessages[status] || 'status has been updated'}. - Medhelm Supplies`;

    return await sendSMS(phoneNumber, message);
};

// Issue/delay notification SMS
const sendIssueNotificationSMS = async (phoneNumber, orderData) => {
    const { name, orderId, issueType } = orderData;

    const message = `Hi ${name}, there's an update about your order ${orderId}: ${issueType}. Please contact us for details. - Medhelm Supplies`;

    return await sendSMS(phoneNumber, message);
};

export {
    sendSMS,
    sendOrderConfirmationSMS,
    sendPaymentConfirmationSMS,
    sendShippingNotificationSMS,
    sendDeliveryNotificationSMS,
    sendOrderStatusUpdateSMS,
    sendIssueNotificationSMS
};