import axios from 'axios';
import { initiatePesapalPayment, getAccessToken, getTransactionStatus } from '../../services/pesapalService.js';
import Order from '../../../supplies-backend/Database/models/order.model.js';
import { validatePesapalPayment } from './payment.validation.js';
import { sendPaymentConfirmation } from '../../services/emailService.js';


function normalizeKenyanPhone(phone) {

    let cleaned = phone.replace(/[^\d+]/g, '');


    if (cleaned.startsWith('+254')) {
        return cleaned;
    } else if (cleaned.startsWith('254')) {
        return '+' + cleaned;
    } else if (cleaned.startsWith('0')) {
        return '+254' + cleaned.substring(1);
    } else if (cleaned.length === 9) {
        return '+254' + cleaned;
    }


    return '+254' + cleaned;
}


export const createOrderAndPayment = async (req, res) => {
    const startTime = Date.now();

    try {
        const { items, shippingAddress, totalAmount, paymentMethod, phone, email, description } = req.body;


        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Items are required' });
        }
        if (!shippingAddress || !totalAmount || !phone || !email) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }


        const orderId = `ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;


        const orderData = {
            orderNumber: orderId,
            items: items,
            shippingAddress: shippingAddress,
            totalAmount: totalAmount,
            paymentMethod: paymentMethod || 'pesapal',
            paymentStatus: 'pending',
            orderStatus: 'pending',
            user: req.user?.id || null,
            createdAt: new Date()
        };


        const newOrder = new Order(orderData);
        await newOrder.save();

        console.log(` Order created: ${orderId}`);


        const normalizedPhone = normalizeKenyanPhone(phone);


        const result = await initiatePesapalPayment(orderId, totalAmount, normalizedPhone, email, description || `Medhelm Supplies Order - ${items.length} item(s)`);


        await Order.findOneAndUpdate(
            { orderNumber: orderId },
            {
                paymentStatus: 'processing',
                transactionTrackingId: result.orderTrackingId,
                paymentTrackingId: result.orderTrackingId,
                paymentInitiatedAt: new Date()
            }
        );


        console.log(` PesaPal payment initiated for order ${orderId}:`, {
            orderTrackingId: result.orderTrackingId,
            amount: totalAmount,
            email: email,
            duration: Date.now() - startTime + 'ms'
        });

        res.json({
            success: true,
            message: 'Order created and PesaPal payment initiated successfully',
            paymentUrl: result.paymentUrl,
            orderTrackingId: result.orderTrackingId,
            orderId: orderId
        });
    } catch (err) {
        console.error(' Order and payment creation failed:', {
            error: err.message,
            stack: err.stack,
            duration: Date.now() - startTime + 'ms',
            timestamp: new Date().toISOString()
        });


        let userMessage = 'Order creation and payment initiation failed. Please try again.';
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
        }

        res.status(statusCode).json({
            success: false,
            message: userMessage,
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};


export const createPesapalPayment = async (req, res) => {
    const startTime = Date.now();
    let orderId = req.body?.orderId;

    try {
        const { error, value } = validatePesapalPayment(req.body);
        if (error) {
            console.warn('Payment validation failed:', error.details[0].message);
            return res.status(400).json({ success: false, message: `Validation error: ${error.details[0].message}` });
        }

        let { orderId: validatedOrderId, amount, phone, email, description = 'Order Payment' } = value;


        phone = normalizeKenyanPhone(phone);
        orderId = validatedOrderId;


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


        await Order.findOneAndUpdate(
            { orderNumber: orderId },
            {
                paymentStatus: 'pending',
                paymentInitiatedAt: new Date()
            }
        );


        const result = await initiatePesapalPayment(orderId, amount, phone, email, description);


        await Order.findOneAndUpdate(
            { orderNumber: orderId },
            {
                paymentStatus: 'processing',
                transactionTrackingId: result.orderTrackingId,
                paymentTrackingId: result.orderTrackingId,
                paymentInitiatedAt: new Date()
            }
        );


        console.log(` PesaPal payment initiated for order ${orderId}:`, {
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
        console.error(' Payment initiation failed:', {
            orderId,
            error: err.message,
            stack: err.stack,
            duration: duration + 'ms',
            timestamp: new Date().toISOString()
        });


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



export const paymentCallback = async (req, res) => {
    console.log(' PesaPal callback received:', {
        method: req.method,
        body: req.body,
        query: req.query,
        headers: req.headers,
        timestamp: new Date().toISOString(),
        ip: req.ip || req.connection?.remoteAddress
    });

    try {

        let orderTrackingId, orderId;


        if (req.body && typeof req.body === 'object') {
            orderTrackingId = req.body.pesapal_transaction_tracking_id;
            orderId = req.body.pesapal_merchant_reference;
        }


        if (!orderTrackingId || !orderId) {
            orderTrackingId = req.query.pesapal_transaction_tracking_id;
            orderId = req.query.pesapal_merchant_reference;
        }


        if (!orderTrackingId) {
            orderTrackingId = req.body?.orderTrackingId || req.query?.orderTrackingId;
        }
        if (!orderId) {
            orderId = req.body?.orderId || req.query?.orderId || req.body?.merchant_reference || req.query?.merchant_reference;
        }

        console.log(' Callback parameters extracted:', {
            orderTrackingId,
            orderId,
            rawBody: req.body,
            rawQuery: req.query
        });

        if (!orderTrackingId || !orderId) {
            console.warn(' Missing required callback parameters - orderTrackingId or orderId not found');
            console.log('Available body keys:', Object.keys(req.body || {}));
            console.log('Available query keys:', Object.keys(req.query || {}));
            return res.status(400).send('<script>window.opener.postMessage("pesapal-payment-failed", "*");window.close();</script>');
        }


        let transactionData;
        let transactionStatus = 'unknown';

        try {
            console.log(' Querying PesaPal for transaction status...');
            transactionData = await getTransactionStatus(orderTrackingId);
            transactionStatus = transactionData.status || transactionData.status_code || 'unknown';
            console.log(' Transaction status from PesaPal:', {
                status: transactionStatus,
                paymentMethod: transactionData.payment_method,
                amount: transactionData.amount,
                fullResponse: transactionData
            });
        } catch (statusError) {
            console.warn('️ Failed to query PesaPal for status, proceeding with callback data:', statusError.message);


            transactionStatus = 'completed';
            console.log(' Using fallback status "completed" for IPN callback');
        }


        let paymentStatus = 'failed';
        let message = 'pesapal-payment-failed';
        const statusLower = transactionStatus.toLowerCase();


        if (statusLower.includes('completed') || statusLower.includes('success') || statusLower.includes('successful')) {
            paymentStatus = 'paid';
            message = 'pesapal-payment-success';
        } else if (statusLower.includes('pending') || statusLower.includes('processing')) {
            paymentStatus = 'pending';
            message = 'pesapal-payment-pending';
        } else if (statusLower.includes('failed') || statusLower.includes('cancelled') || statusLower.includes('cancel')) {
            paymentStatus = 'failed';
            message = 'pesapal-payment-failed';
        } else if (statusLower.includes('invalid') || statusLower.includes('error')) {
            paymentStatus = 'failed';
            message = 'pesapal-payment-failed';
        }

        console.log(` Updating order ${orderId}: paymentStatus=${paymentStatus}, transactionStatus=${transactionStatus}`);

        const order = await Order.findOneAndUpdate(
            { orderNumber: orderId },
            {
                paymentStatus,
                transactionStatus: transactionStatus,
                transactionTrackingId: orderTrackingId,
                paymentCompletedAt: statusLower.includes('completed') || statusLower.includes('success') ? new Date() : undefined,
                paidAt: statusLower.includes('completed') || statusLower.includes('success') ? new Date() : undefined,
                lastPaymentUpdate: new Date()
            },
            { new: true }
        );

        if (!order) {
            console.warn(`️ Order ${orderId} not found in database`);
            return res.status(404).send('<script>window.opener.postMessage("pesapal-payment-failed", "*");window.close();</script>');
        }


        if ((statusLower.includes('completed') || statusLower.includes('success')) && order?.shippingAddress?.email) {
            try {
                await sendPaymentConfirmation({
                    email: order.shippingAddress.email,
                    name: order.shippingAddress.fullName,
                    orderId: order.orderNumber,
                    totalAmount: order.totalAmount,
                    paymentMethod: order.paymentMethod || 'pesapal'
                });
                console.log(` Payment confirmation email sent for order ${orderId}`);
            } catch (emailError) {
                console.warn('️ Payment confirmation email failed:', emailError);
            }
        }

        console.log(` Payment callback for order ${orderId}: Status updated to ${paymentStatus}`);


        res.status(200).send(`<script>window.opener.postMessage("${message}", "*");window.close();</script>`);
    } catch (err) {
        console.error(' Payment callback error:', err.message);
        res.status(500).send('<script>window.opener.postMessage("pesapal-payment-failed", "*");window.close();</script>');
    }
};


export const getPaymentStatus = async (req, res) => {
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


        let latestStatus = null;
        if (order.transactionTrackingId && order.paymentStatus !== 'paid') {
            try {
                console.log(` Refreshing payment status for order ${orderId} from PesaPal...`);
                const transactionData = await getTransactionStatus(order.transactionTrackingId);
                latestStatus = transactionData.status;


                if (latestStatus && latestStatus.toLowerCase() !== (order.transactionStatus || '').toLowerCase()) {
                    let newPaymentStatus = order.paymentStatus;
                    const statusLower = latestStatus.toLowerCase();

                    if (statusLower.includes('completed') || statusLower.includes('success')) {
                        newPaymentStatus = 'paid';
                    } else if (statusLower.includes('failed') || statusLower.includes('cancelled')) {
                        newPaymentStatus = 'failed';
                    } else if (statusLower.includes('pending') || statusLower.includes('processing')) {
                        newPaymentStatus = 'pending';
                    }


                    await Order.findOneAndUpdate(
                        { orderNumber: orderId },
                        {
                            paymentStatus: newPaymentStatus,
                            transactionStatus: latestStatus,
                            lastPaymentUpdate: new Date(),
                            paymentCompletedAt: newPaymentStatus === 'paid' ? new Date() : order.paymentCompletedAt,
                            paidAt: newPaymentStatus === 'paid' ? new Date() : order.paidAt
                        }
                    );

                    console.log(` Updated order ${orderId} status: ${order.paymentStatus} → ${newPaymentStatus}`);
                }
            } catch (statusError) {
                console.warn(`️ Failed to refresh status from PesaPal for order ${orderId}:`, statusError.message);
            }
        }


        const updatedOrder = await Order.findOne({ orderNumber: orderId });

        res.json({
            success: true,
            data: {
                orderId: updatedOrder.orderNumber,
                paymentStatus: updatedOrder.paymentStatus,
                transactionStatus: updatedOrder.transactionStatus,
                paymentTrackingId: updatedOrder.paymentTrackingId,
                transactionTrackingId: updatedOrder.transactionTrackingId,
                totalAmount: updatedOrder.totalAmount,
                paymentInitiatedAt: updatedOrder.paymentInitiatedAt,
                paymentCompletedAt: updatedOrder.paymentCompletedAt,
                lastPaymentUpdate: updatedOrder.lastPaymentUpdate,
                updatedAt: updatedOrder.updatedAt,
                statusRefreshed: latestStatus !== null
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


export const refreshPaymentStatus = async (req, res) => {
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

        if (!order.transactionTrackingId) {
            return res.status(400).json({
                success: false,
                message: 'No transaction tracking ID found for this order'
            });
        }

        console.log(` Manually refreshing payment status for order ${orderId}...`);


        const transactionData = await getTransactionStatus(order.transactionTrackingId);
        const latestStatus = transactionData.status;


        let paymentStatus = order.paymentStatus;
        const statusLower = latestStatus.toLowerCase();

        if (statusLower.includes('completed') || statusLower.includes('success')) {
            paymentStatus = 'paid';
        } else if (statusLower.includes('failed') || statusLower.includes('cancelled')) {
            paymentStatus = 'failed';
        } else if (statusLower.includes('pending') || statusLower.includes('processing')) {
            paymentStatus = 'pending';
        }


        const updatedOrder = await Order.findOneAndUpdate(
            { orderNumber: orderId },
            {
                paymentStatus,
                transactionStatus: latestStatus,
                lastPaymentUpdate: new Date(),
                paymentCompletedAt: paymentStatus === 'paid' ? new Date() : order.paymentCompletedAt,
                paidAt: paymentStatus === 'paid' ? new Date() : order.paidAt
            },
            { new: true }
        );

        console.log(` Manually updated order ${orderId} status: ${order.paymentStatus} → ${paymentStatus}`);

        res.json({
            success: true,
            message: `Payment status refreshed successfully`,
            data: {
                orderId: updatedOrder.orderNumber,
                oldStatus: order.paymentStatus,
                newStatus: updatedOrder.paymentStatus,
                transactionStatus: updatedOrder.transactionStatus,
                lastPaymentUpdate: updatedOrder.lastPaymentUpdate
            }
        });
    } catch (error) {
        console.error('Refresh payment status error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to refresh payment status'
        });
    }
};


export const bulkRefreshPaymentStatus = async (req, res) => {
    try {
        const { orderIds } = req.body;

        if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Order IDs array is required'
            });
        }

        console.log(` Bulk refreshing payment status for ${orderIds.length} orders...`);

        const results = [];
        let successCount = 0;
        let errorCount = 0;

        for (const orderId of orderIds) {
            try {
                const order = await Order.findOne({ orderNumber: orderId });

                if (!order) {
                    results.push({ orderId, success: false, error: 'Order not found' });
                    errorCount++;
                    continue;
                }

                if (!order.transactionTrackingId) {
                    results.push({ orderId, success: false, error: 'No transaction tracking ID' });
                    errorCount++;
                    continue;
                }


                const transactionData = await getTransactionStatus(order.transactionTrackingId);
                const latestStatus = transactionData.status;


                let paymentStatus = order.paymentStatus;
                const statusLower = latestStatus.toLowerCase();

                if (statusLower.includes('completed') || statusLower.includes('success')) {
                    paymentStatus = 'paid';
                } else if (statusLower.includes('failed') || statusLower.includes('cancelled')) {
                    paymentStatus = 'failed';
                } else if (statusLower.includes('pending') || statusLower.includes('processing')) {
                    paymentStatus = 'pending';
                }


                const updatedOrder = await Order.findOneAndUpdate(
                    { orderNumber: orderId },
                    {
                        paymentStatus,
                        transactionStatus: latestStatus,
                        lastPaymentUpdate: new Date(),
                        paymentCompletedAt: paymentStatus === 'paid' ? new Date() : order.paymentCompletedAt,
                        paidAt: paymentStatus === 'paid' ? new Date() : order.paidAt
                    },
                    { new: true }
                );

                results.push({
                    orderId,
                    success: true,
                    oldStatus: order.paymentStatus,
                    newStatus: updatedOrder.paymentStatus,
                    transactionStatus: updatedOrder.transactionStatus
                });
                successCount++;

            } catch (orderError) {
                console.error(`Error refreshing order ${orderId}:`, orderError.message);
                results.push({ orderId, success: false, error: orderError.message });
                errorCount++;
            }
        }

        console.log(` Bulk refresh completed: ${successCount} successful, ${errorCount} failed`);

        res.json({
            success: true,
            message: `Bulk payment status refresh completed: ${successCount} successful, ${errorCount} failed`,
            data: {
                totalProcessed: orderIds.length,
                successCount,
                errorCount,
                results
            }
        });
    } catch (error) {
        console.error('Bulk refresh payment status error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to bulk refresh payment status'
        });
    }
};