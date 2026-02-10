import Notification from '../../Database/models/notification.model.js';
import User from '../../Database/models/user.model.js';
import { sendEmail, getEmailTemplate } from './emailService.js';
import { sendSMS } from './smsService.js';



const WEB_PUSH_PUBLIC_KEY = process.env.WEB_PUSH_PUBLIC_KEY;

let pushSubscriptions = new Map();
const pushNotificationService = {
    subscribe: async (userId, subscription) => {
        try {
            const key = `${userId}:${subscription.endpoint}`;
            pushSubscriptions.set(key, {
                userId,
                subscription,
                createdAt: new Date()
            });
            return { success: true };
        } catch (error) {
            console.error('Push subscription error:', error);
            return { success: false, error: error.message };
        }
    },

    unsubscribe: async (userId, endpoint) => {
        try {
            const key = `${userId}:${endpoint}`;
            pushSubscriptions.delete(key);
            return { success: true };
        } catch (error) {
            console.error('Push unsubscribe error:', error);
            return { success: false, error: error.message };
        }
    },

    sendPushNotification: async (userId, title, body, data = {}) => {
        try {
            const userSubscriptions = [];
            pushSubscriptions.forEach((sub, key) => {
                if (key.startsWith(`${userId}:`)) {
                    userSubscriptions.push(sub.subscription);
                }
            });

            if (userSubscriptions.length === 0) {
                console.log(`No push subscriptions for user ${userId}`);
                return { success: true, sent: 0 };
            }

            const payload = JSON.stringify({
                title,
                body,
                icon: process.env.PUSH_ICON || '/icons/notification-icon.png',
                badge: process.env.PUSH_BADGE || '/icons/badge-icon.png',
                data: {
                    ...data,
                    timestamp: Date.now()
                }
            });

            console.log(`Push notification for user ${userId}:`, { title, body, data });

            return {
                success: true,
                sent: userSubscriptions.length,
                message: `Push notification sent to ${userSubscriptions.length} devices`
            };
        } catch (error) {
            console.error('Push notification error:', error);
            return { success: false, error: error.message };
        }
    },

    broadcast: async (userIds, title, body, data = {}) => {
        const results = [];
        for (const userId of userIds) {
            const result = await pushNotificationService.sendPushNotification(userId, title, body, data);
            results.push({ userId, ...result });
        }
        return results;
    }
};

const createNotification = async (userId, title, message, type = 'general', data = {}, priority = 'medium') => {
    try {
        const notification = new Notification({
            recipient: userId,
            type,
            title,
            message,
            priority,
            actionUrl: data.actionUrl || null,
            metadata: data.metadata || {},
            createdAt: new Date()
        });

        await notification.save();
        return notification;
    } catch (error) {
        console.error('Failed to create notification:', error);
        return null;
    }
};


const sendMultiChannelNotification = async (options) => {
    const {
        userId,
        email,
        phone,
        title,
        message,
        type = 'general',
        priority = 'medium',
        data = {},
        channels = ['inapp'], // email, sms, push, inapp
        metadata = {}
    } = options;

    const results = {
        inapp: null,
        email: null,
        sms: null,
        push: null
    };

    try {
        if (channels.includes('inapp') && userId) {
            const notification = await createNotification(userId, title, message, type, data, priority);
            results.inapp = { success: !!notification, notification };
        }

        if (channels.includes('email') && email) {
            const content = `
                <h2>${title}</h2>
                <p>${message}</p>
                ${metadata.orderId ? `<p><strong>Order ID:</strong> ${metadata.orderId}</p>` : ''}
                ${metadata.orderNumber ? `<p><strong>Order Number:</strong> ${metadata.orderNumber}</p>` : ''}
                ${metadata.status ? `<p><strong>Status:</strong> ${metadata.status.toUpperCase()}</p>` : ''}
            `;
            const html = getEmailTemplate(title, content);
            const emailResult = await sendEmail(email, `${title}`, html);
            results.email = { success: emailResult.success, ...emailResult };
        }

        if (channels.includes('sms') && phone) {
            let phoneNumber = phone;
            if (phoneNumber.startsWith('0')) {
                phoneNumber = '+254' + phoneNumber.substring(1);
            } else if (!phoneNumber.startsWith('+')) {
                phoneNumber = '+254' + phoneNumber;
            }

            const smsMessage = `${title}: ${message.substring(0, 160 - title.length - 3)}...`;
            const smsResult = await sendSMS(phoneNumber, smsMessage);
            results.sms = { success: smsResult.success, ...smsResult };
        }

        if (channels.includes('push') && userId) {
            const pushResult = await pushNotificationService.sendPushNotification(userId, title, message, {
                type,
                ...data
            });
            results.push = pushResult;
        }

        return { success: true, results };
    } catch (error) {
        console.error('Multi-channel notification error:', error);
        return { success: false, error: error.message, results };
    }
};

const notifyOrderStatusChange = async (order, newStatus) => {
    const statusMessages = {
        'processing': 'Your order is now being processed and prepared for shipment.',
        'fulfilled': 'Your order has been fulfilled and is ready for shipping.',
        'ready': 'Your order is ready for pickup or shipping.',
        'shipped': `Your order has been shipped${order.trackingNumber ? ` (Tracking: ${order.trackingNumber})` : ''}.`,
        'delivered': 'Your order has been delivered successfully!',
        'picked_up': 'Your order has been picked up.',
        'cancelled': 'Your order has been cancelled.'
    };

    const titles = {
        'processing': 'Order Processing',
        'fulfilled': 'Order Fulfilled',
        'ready': 'Order Ready',
        'shipped': 'Order Shipped',
        'delivered': 'Order Delivered',
        'picked_up': 'Order Picked Up',
        'cancelled': 'Order Cancelled'
    };

    const title = titles[newStatus] || 'Order Update';
    const message = statusMessages[newStatus] || `Your order status has been updated to ${newStatus}`;

    return await sendMultiChannelNotification({
        userId: order.user?._id || order.user,
        email: order.shippingAddress?.email,
        phone: order.shippingAddress?.phone,
        title,
        message,
        type: 'order',
        priority: newStatus === 'cancelled' ? 'high' : 'medium',
        data: {
            orderId: order._id,
            orderNumber: order.orderNumber,
            status: newStatus,
            trackingNumber: order.trackingNumber,
            actionUrl: `/orders/${order.orderNumber}`
        },
        metadata: {
            orderNumber: order.orderNumber,
            status: newStatus
        },
        channels: ['inapp', 'email', 'sms']
    });
};

const notifyNewOrder = async (order) => {
    const message = `New order ${order.orderNumber} from ${order.shippingAddress?.fullName} for KES ${order.totalAmount?.toLocaleString()}`;

    const adminUsers = await User.find({ role: { $in: ['admin', 'super_admin', 'staff'] } });

    const results = [];
    for (const admin of adminUsers) {
        const result = await sendMultiChannelNotification({
            userId: admin._id,
            email: admin.email,
            phone: admin.phone,
            title: 'New Order Received',
            message,
            type: 'order',
            priority: 'high',
            data: {
                orderId: order._id,
                orderNumber: order.orderNumber,
                actionUrl: `/admin/orders/${order._id}`
            },
            channels: ['inapp', 'email', 'push']
        });
        results.push({ adminId: admin._id, ...result });
    }

    return { success: true, results };
};

const notifyPaymentReceived = async (order) => {
    const title = 'Payment Confirmed';
    const message = `Payment of KES ${order.totalAmount?.toLocaleString()} for order ${order.orderNumber} has been confirmed.`;

    return await sendMultiChannelNotification({
        userId: order.user?._id || order.user,
        email: order.shippingAddress?.email,
        phone: order.shippingAddress?.phone,
        title,
        message,
        type: 'payment',
        priority: 'high',
        data: {
            orderId: order._id,
            orderNumber: order.orderNumber,
            amount: order.totalAmount,
            actionUrl: `/orders/${order.orderNumber}`
        },
        channels: ['inapp', 'email', 'sms']
    });
};

const notifyLowStock = async (product, currentStock) => {
    const message = `Low stock alert: ${product.name} has only ${currentStock} units left (Reorder level: ${product.reorderLevel || 10})`;
    const title = 'Low Stock Alert';

    const adminUsers = await User.find({ role: { $in: ['admin', 'super_admin', 'inventory_manager'] } });

    const results = [];
    for (const admin of adminUsers) {
        const result = await sendMultiChannelNotification({
            userId: admin._id,
            email: admin.email,
            title,
            message,
            type: 'inventory',
            priority: 'high',
            data: {
                productId: product._id,
                productName: product.name,
                currentStock,
                actionUrl: `/admin/products/${product._id}`
            },
            channels: ['inapp', 'email', 'push']
        });
        results.push({ adminId: admin._id, ...result });
    }

    return { success: true, results };
};

const notifyRefundProcessed = async (order, refundAmount) => {
    const title = 'Refund Processed';
    const message = `Your refund of KES ${refundAmount?.toLocaleString()} for order ${order.orderNumber} has been processed.`;

    return await sendMultiChannelNotification({
        userId: order.user?._id || order.user,
        email: order.shippingAddress?.email,
        phone: order.shippingAddress?.phone,
        title,
        message,
        type: 'payment',
        priority: 'high',
        data: {
            orderId: order._id,
            orderNumber: order.orderNumber,
            refundAmount,
            actionUrl: `/orders/${order.orderNumber}`
        },
        channels: ['inapp', 'email', 'sms']
    });
};

const sendOrderReminderEmail = async ({ email, name, orders, totalAmount, orderCount }) => {
    try {
        const ordersList = orders.map(order => `
            <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
                <p style="font-weight: bold; margin-bottom: 8px;">Order #${order.orderNumber}</p>
                <p style="color: #6b7280; font-size: 14px;">
                    ${order.items.map(item => `${item.name} x${item.quantity} - KES ${item.price?.toLocaleString()}`).join('<br>')}
                </p>
                <p style="font-weight: bold; margin-top: 8px;">Total: KES ${order.total?.toLocaleString()}</p>
            </div>
        `).join('');

        const content = `
            <div style="padding: 24px;">
                <h2 style="color: #1f2937; margin-bottom: 16px;">Hi ${name},</h2>
                <p style="color: #4b5563; margin-bottom: 24px;">
                    You have ${orderCount} pending order(s) waiting for payment. Don't worry, we're here to help you complete your purchase!
                </p>
                ${ordersList}
                <div style="background: #f3f4f6; padding: 24px; border-radius: 12px; margin-top: 24px;">
                    <p style="font-size: 18px; font-weight: bold; margin-bottom: 16px;">
                        Total Outstanding: KES ${totalAmount?.toLocaleString()}
                    </p>
                    <a href="${process.env.FRONTEND_URL || 'https://medhelmsupplies.co.ke'}/orders" 
                       style="display: inline-block; background: linear-gradient(to right, #2563eb, #7c3aed); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 12px;">
                        Complete Payment Now
                    </a>
                </div>
                <p style="color: #6b7280; margin-top: 24px; font-size: 14px;">
                    If you have any questions, feel free to contact our support team.
                </p>
                <p style="color: #6b7280; margin-top: 16px; font-size: 14px;">
                    Best regards,<br>The Medhelm Supplies Team
                </p>
            </div>
        `;

        const html = getEmailTemplate('Complete Your Pending Order(s)', content);
        const result = await sendEmail(email, 'Complete Your Pending Order(s)', html);
        return result;
    } catch (error) {
        console.error('Failed to send order reminder email:', error);
        return { success: false, error: error.message };
    }
};

const sendCartReminderEmail = async ({ email, name, cartItems, cartTotal }) => {
    try {
        const itemsList = cartItems.map(item => `
            <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
                    ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; margin-right: 12px;" />` : ''}
                    <span style="font-weight: 500;">${item.name}</span>
                </td>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">x${item.quantity}</td>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">KES ${item.price?.toLocaleString()}</td>
            </tr>
        `).join('');

        const content = `
            <div style="padding: 24px;">
                <h2 style="color: #1f2937; margin-bottom: 16px;">Hi ${name},</h2>
                <p style="color: #4b5563; margin-bottom: 24px;">
                    You left some items in your shopping cart. Don't miss out on these great medical supplies!
                </p>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                    ${itemsList}
                </table>
                <div style="background: #f3f4f6; padding: 24px; border-radius: 12px;">
                    <p style="font-size: 18px; font-weight: bold; margin-bottom: 16px;">
                        Cart Total: KES ${cartTotal?.toLocaleString()}
                    </p>
                    <a href="${process.env.FRONTEND_URL || 'https://medhelmsupplies.co.ke'}/cart" 
                       style="display: inline-block; background: linear-gradient(to right, #2563eb, #7c3aed); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                        Complete Your Order
                    </a>
                </div>
                <p style="color: #6b7280; margin-top: 24px; font-size: 14px;">
                    Having trouble? Contact our support team and we'll be happy to assist you.
                </p>
                <p style="color: #6b7280; margin-top: 16px; font-size: 14px;">
                    Best regards,<br>The Medhelm Supplies Team
                </p>
            </div>
        `;

        const html = getEmailTemplate('Complete Your Shopping Cart', content);
        const result = await sendEmail(email, 'Complete Your Shopping Cart', html);
        return result;
    } catch (error) {
        console.error('Failed to send cart reminder email:', error);
        return { success: false, error: error.message };
    }
};

const getUserNotifications = async (userId, page = 1, limit = 20, filters = {}) => {
    try {
        const skip = (page - 1) * limit;
        const query = { recipient: userId };

        if (filters.status) query.status = filters.status;
        if (filters.type) query.type = filters.type;
        if (filters.priority) query.priority = filters.priority;

        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Notification.countDocuments(query);
        const unreadCount = await Notification.countDocuments({ recipient: userId, status: 'unread' });

        return {
            success: true,
            notifications,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            },
            unreadCount
        };
    } catch (error) {
        console.error('Failed to get notifications:', error);
        return { success: false, error: error.message };
    }
};

const markAsRead = async (notificationId, userId) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: notificationId, recipient: userId },
            { status: 'read', readAt: new Date() },
            { new: true }
        );
        return { success: !!notification, notification };
    } catch (error) {
        console.error('Failed to mark notification as read:', error);
        return { success: false, error: error.message };
    }
};

const markAllAsRead = async (userId) => {
    try {
        const result = await Notification.updateMany(
            { recipient: userId, status: 'unread' },
            { status: 'read', readAt: new Date() }
        );
        return { success: true, modifiedCount: result.modifiedCount };
    } catch (error) {
        console.error('Failed to mark all notifications as read:', error);
        return { success: false, error: error.message };
    }
};

const deleteNotification = async (notificationId, userId) => {
    try {
        const notification = await Notification.findOneAndDelete({
            _id: notificationId,
            recipient: userId
        });
        return { success: !!notification };
    } catch (error) {
        console.error('Failed to delete notification:', error);
        return { success: false, error: error.message };
    }
};

const cleanupOldNotifications = async (days = 30) => {
    try {
        const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const result = await Notification.deleteMany({
            status: 'read',
            createdAt: { $lt: cutoffDate }
        });
        console.log(`Cleaned up ${result.deletedCount} old notifications`);
        return { success: true, deletedCount: result.deletedCount };
    } catch (error) {
        console.error('Failed to cleanup old notifications:', error);
        return { success: false, error: error.message };
    }
};

export {
    pushNotificationService,
    createNotification,
    sendMultiChannelNotification,
    notifyOrderStatusChange,
    notifyNewOrder,
    notifyPaymentReceived,
    notifyLowStock,
    notifyRefundProcessed,
    sendOrderReminderEmail,
    sendCartReminderEmail,
    getUserNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    cleanupOldNotifications,
    WEB_PUSH_PUBLIC_KEY
};
