import axios from 'axios';
import mongoose from 'mongoose';
import Order from '../../Database/models/order.model.js';
import { getTransactionStatus } from './pesapalService.js';
import { notifyPaymentReceived, notifyOrderStatusChange } from './enhancedNotificationService.js';



const PESAPAL_BASE_URL = process.env.PESAPAL_TEST_MODE === 'true'
    ? 'https://pay.pesapal.com/v3/api'
    : 'https://pay.pesapal.com/v3/api';

const PESAPAL_CONSUMER_KEY = process.env.PESAPAL_CONSUMER_KEY;
const PESAPAL_CONSUMER_SECRET = process.env.PESAPAL_CONSUMER_SECRET;

const getAccessToken = async () => {
    try {
        const response = await axios.post(
            `${PESAPAL_BASE_URL}/Auth/RequestToken`,
            {
                consumer_key: PESAPAL_CONSUMER_KEY,
                consumer_secret: PESAPAL_CONSUMER_SECRET
            },
            {
                headers: { 'Content-Type': 'application/json' }
            }
        );

        if (response.data && response.data.token) {
            return response.data.token;
        }
        throw new Error('Failed to get access token');
    } catch (error) {
        console.error('PesaPal auth error:', error.response?.data || error.message);
        throw error;
    }
};

// Process IPN callback from PesaPal
const processIPNCallback = async (ipnData) => {
    try {
        console.log('Processing PesaPal IPN:', JSON.stringify(ipnData, null, 2));

        const { OrderTrackingId, OrderNotificationType, OrderMerchantReference } = ipnData;

        // Find order by tracking ID or merchant reference
        let order = null;

        if (OrderTrackingId) {
            order = await Order.findOne({ transactionTrackingId: OrderTrackingId });
        }

        if (!order && OrderMerchantReference) {
            order = await Order.findOne({ orderNumber: OrderMerchantReference });
        }

        if (!order) {
            console.error('Order not found for IPN:', ipnData);
            return { success: false, error: 'Order not found' };
        }

        // Handle different notification types
        switch (OrderNotificationType) {
            case 'UPDATE':
                return await handlePaymentUpdate(order, ipnData);
            case 'COMPLETED':
                return await handlePaymentCompleted(order, ipnData);
            case 'FAILED':
                return await handlePaymentFailed(order, ipnData);
            case 'CANCELLED':
                return await handlePaymentCancelled(order, ipnData);
            default:
                console.log('Unknown notification type:', OrderNotificationType);
                return { success: true, message: 'Notification type not handled' };
        }
    } catch (error) {
        console.error('IPN processing error:', error);
        return { success: false, error: error.message };
    }
};

// Handle payment status update
const handlePaymentUpdate = async (order, ipnData) => {
    try {
        // Get latest transaction status from PesaPal
        const transactionStatus = await getTransactionStatus(order.transactionTrackingId);

        const status = transactionStatus.status?.toLowerCase() || '';

        let paymentStatus = order.paymentStatus;
        let paymentStatusChanged = false;

        if (status.includes('completed') || status.includes('success') || status.includes('successful')) {
            if (order.paymentStatus !== 'paid') {
                paymentStatus = 'paid';
                paymentStatusChanged = true;
                order.paidAt = new Date();
                order.paymentCompletedAt = new Date();
            }
        } else if (status.includes('pending') || status.includes('processing')) {
            paymentStatus = 'pending';
        } else if (status.includes('failed') || status.includes('cancelled') || status.includes('cancel')) {
            paymentStatus = 'failed';
        }

        order.transactionStatus = status;
        order.lastPaymentCheck = new Date();

        if (paymentStatusChanged) {
            order.paymentStatus = paymentStatus;
            order.orderStatus = 'pending'; // Ready for processing
            order.timeline.push({
                status: 'pending',
                changedAt: new Date(),
                note: `Payment confirmed via IPN (${status})`
            });
        }

        await order.save();

        // Send notification if payment was just confirmed
        if (paymentStatusChanged) {
            await notifyPaymentReceived(order);
        }

        console.log(`IPN: Order ${order.orderNumber} payment status updated to ${paymentStatus}`);

        return {
            success: true,
            orderId: order.orderNumber,
            paymentStatus: order.paymentStatus,
            paymentStatusChanged
        };
    } catch (error) {
        console.error('Error handling payment update:', error);
        return { success: false, error: error.message };
    }
};

// Handle payment completed
const handlePaymentCompleted = async (order, ipnData) => {
    try {
        if (order.paymentStatus !== 'paid') {
            order.paymentStatus = 'paid';
            order.orderStatus = 'pending';
            order.paidAt = new Date();
            order.paymentCompletedAt = new Date();
            order.transactionStatus = 'completed';

            order.timeline.push({
                status: 'pending',
                changedAt: new Date(),
                note: 'Payment completed via IPN'
            });

            await order.save();
            await notifyPaymentReceived(order);

            console.log(`IPN: Order ${order.orderNumber} payment completed`);
        }

        return { success: true, orderId: order.orderNumber };
    } catch (error) {
        console.error('Error handling payment completed:', error);
        return { success: false, error: error.message };
    }
};

// Handle payment failed
const handlePaymentFailed = async (order, ipnData) => {
    try {
        order.paymentStatus = 'failed';
        order.transactionStatus = 'failed';
        order.lastPaymentCheck = new Date();

        order.timeline.push({
            status: order.orderStatus,
            changedAt: new Date(),
            note: 'Payment failed via IPN'
        });

        await order.save();

        console.log(`IPN: Order ${order.orderNumber} payment failed`);

        return { success: true, orderId: order.orderNumber };
    } catch (error) {
        console.error('Error handling payment failed:', error);
        return { success: false, error: error.message };
    }
};

// Handle payment cancelled
const handlePaymentCancelled = async (order, ipnData) => {
    try {
        order.paymentStatus = 'failed';
        order.transactionStatus = 'cancelled';
        order.lastPaymentCheck = new Date();

        order.timeline.push({
            status: order.orderStatus,
            changedAt: new Date(),
            note: 'Payment cancelled via IPN'
        });

        await order.save();

        console.log(`IPN: Order ${order.orderNumber} payment cancelled`);

        return { success: true, orderId: order.orderNumber };
    } catch (error) {
        console.error('Error handling payment cancelled:', error);
        return { success: false, error: error.message };
    }
};

// ============================================
// REFUND PROCESSING
// ============================================

const processRefund = async (orderId, refundAmount, reason, options = {}) => {
    try {
        const order = await Order.findById(orderId);

        if (!order) {
            return { success: false, error: 'Order not found' };
        }

        if (order.paymentStatus !== 'paid') {
            return { success: false, error: 'Order has not been paid' };
        }

        const maxRefundAmount = order.totalAmount;
        const actualRefundAmount = refundAmount || maxRefundAmount;

        if (actualRefundAmount > maxRefundAmount) {
            return { success: false, error: 'Refund amount exceeds order total' };
        }

        // Call PesaPal refund API
        const refundResult = await initiatePesaPalRefund(
            order.transactionTrackingId,
            actualRefundAmount,
            reason
        );

        if (!refundResult.success) {
            return { success: false, error: refundResult.error };
        }

        // Update order
        order.paymentStatus = 'refunded';
        order.refundAmount = actualRefundAmount;
        order.refundReason = reason;
        order.refundDate = new Date();
        order.refundTransactionId = refundResult.refundId;

        order.timeline.push({
            status: order.orderStatus,
            changedAt: new Date(),
            note: `Refund of KES ${actualRefundAmount.toLocaleString()} processed${reason ? `: ${reason}` : ''}`
        });

        await order.save();

        // Import and call notification
        const { notifyRefundProcessed } = await import('./enhancedNotificationService.js');
        await notifyRefundProcessed(order, actualRefundAmount);

        console.log(`Refund processed for order ${order.orderNumber}: KES ${actualRefundAmount.toLocaleString()}`);

        return {
            success: true,
            orderId: order.orderNumber,
            refundAmount: actualRefundAmount,
            refundId: refundResult.refundId
        };
    } catch (error) {
        console.error('Refund processing error:', error);
        return { success: false, error: error.message };
    }
};

const initiatePesaPalRefund = async (transactionTrackingId, amount, reason = '') => {
    try {
        const token = await getAccessToken();

        const response = await axios.post(
            `${PESAPAL_BASE_URL}/Refund/Request`,
            {
                orderTrackingId: transactionTrackingId,
                refundAmount: amount,
                refundReason: reason || 'Customer refund request'
            },
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.data && response.data.refundTrackingId) {
            return {
                success: true,
                refundId: response.data.refundTrackingId,
                status: response.data.status
            };
        }

        throw new Error('Invalid refund response');
    } catch (error) {
        console.error('PesaPal refund error:', error.response?.data || error.message);
        return { success: false, error: error.response?.data?.message || error.message };
    }
};

const checkRefundStatus = async (refundTrackingId) => {
    try {
        const token = await getAccessToken();

        const response = await axios.get(
            `${PESAPAL_BASE_URL}/Refund/GetRefundStatus`,
            {
                params: { refundTrackingId },
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return {
            success: true,
            status: response.data.status,
            amount: response.data.refundAmount,
            processedAt: response.data.processedAt
        };
    } catch (error) {
        console.error('Refund status check error:', error.response?.data || error.message);
        return { success: false, error: error.message };
    }
};

// ============================================
// EXPORTS
// ============================================

export {
    processIPNCallback,
    handlePaymentUpdate,
    handlePaymentCompleted,
    handlePaymentFailed,
    handlePaymentCancelled,
    processRefund,
    initiatePesaPalRefund,
    checkRefundStatus,
    getAccessToken
};
