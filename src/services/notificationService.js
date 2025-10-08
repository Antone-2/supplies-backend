// Comprehensive notification service for Medhelm Supplies  
const Notification = require('../../Database/models/notification.model');
const { sendEmail, getEmailTemplate } = require('./emailService');

// Create in-app notification
const createNotification = async (userId, title, message, type = 'general', data = {}, priority = 'medium') => {
    try {
        const notification = new Notification({
            user: userId,
            title,
            message,
            type,
            data,
            priority
        });

        await notification.save();
        return notification;
    } catch (error) {
        console.error('Failed to create notification:', error);
        return null;
    }
};

// Get user notifications
const getUserNotifications = async (userId, page = 1, limit = 20, unreadOnly = false) => {
    try {
        const query = { user: userId };
        if (unreadOnly) query.isRead = false;

        const skip = (page - 1) * limit;
        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Notification.countDocuments(query);
        const unreadCount = await Notification.countDocuments({ user: userId, isRead: false });

        return {
            notifications,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            },
            unreadCount
        };
    } catch (error) {
        console.error('Failed to get notifications:', error);
        return null;
    }
};

// Mark notification as read
const markAsRead = async (notificationId, userId) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: notificationId, user: userId },
            { isRead: true },
            { new: true }
        );
        return notification;
    } catch (error) {
        console.error('Failed to mark notification as read:', error);
        return null;
    }
};

// Mark all notifications as read
const markAllAsRead = async (userId) => {
    try {
        const result = await Notification.updateMany(
            { user: userId, isRead: false },
            { isRead: true }
        );
        return result.modifiedCount;
    } catch (error) {
        console.error('Failed to mark all notifications as read:', error);
        return 0;
    }
};

// Send order-related notifications
const notifyOrderCreated = async (userId, email, orderData) => {
    const { orderId, totalAmount } = orderData;

    // In-app notification
    if (userId) {
        await createNotification(
            userId,
            'Order Confirmed',
            `Your order ${orderId} has been confirmed and is being processed.`,
            'order',
            { orderId, totalAmount },
            'high'
        );
    }

    // Email notification (already handled in order controller)
    console.log(`Order confirmation sent for ${orderId}`);
};

const notifyOrderStatusChange = async (userId, email, orderData) => {
    const { orderId, status, trackingNumber } = orderData;

    let title, message;
    switch (status) {
        case 'processing':
            title = 'Order Processing';
            message = `Your order ${orderId} is now being processed.`;
            break;
        case 'shipped':
            title = 'Order Shipped';
            message = trackingNumber
                ? `Your order ${orderId} has been shipped. Tracking: ${trackingNumber}`
                : `Your order ${orderId} has been shipped.`;
            break;
        case 'delivered':
            title = 'Order Delivered';
            message = `Your order ${orderId} has been delivered. Thank you for shopping with us!`;
            break;
        case 'cancelled':
            title = 'Order Cancelled';
            message = `Your order ${orderId} has been cancelled.`;
            break;
        default:
            title = 'Order Update';
            message = `Your order ${orderId} status has been updated to ${status}.`;
    }

    // In-app notification
    if (userId) {
        await createNotification(
            userId,
            title,
            message,
            'order',
            { orderId, status, trackingNumber },
            'high'
        );
    }

    // Email notification for important status changes
    if (status === 'delivered' && email) {
        try {
            const content = `
                <h2>Order Delivered Successfully!</h2>
                <p>Great news! Your order <strong>${orderId}</strong> has been delivered.</p>
                <p>We hope you're satisfied with your purchase. If you have any questions or concerns, please don't hesitate to contact us.</p>
                <p>Thank you for choosing Medhelm Supplies!</p>
                <a href="${process.env.FRONTEND_URL}/orders" class="button">View Order History</a>
            `;

            const html = getEmailTemplate('Order Delivered', content);
            await sendEmail(email, `Order Delivered - ${orderId}`, html);
        } catch (emailError) {
            console.warn('Delivery notification email failed:', emailError);
        }
    }
};

// Send promotional notifications
const sendPromotionalNotification = async (userIds, title, message, data = {}) => {
    try {
        const notifications = userIds.map(userId => ({
            user: userId,
            title,
            message,
            type: 'promotion',
            data,
            priority: 'medium'
        }));

        await Notification.insertMany(notifications);
        return notifications.length;
    } catch (error) {
        console.error('Failed to send promotional notifications:', error);
        return 0;
    }
};

// Clean up old notifications
const cleanupOldNotifications = async () => {
    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const result = await Notification.deleteMany({
            createdAt: { $lt: thirtyDaysAgo },
            isRead: true
        });

        console.log(`Cleaned up ${result.deletedCount} old notifications`);
        return result.deletedCount;
    } catch (error) {
        console.error('Failed to cleanup old notifications:', error);
        return 0;
    }
};

// System health notifications for admins
const notifySystemIssue = async (adminUserIds, title, message, priority = 'urgent') => {
    try {
        const notifications = adminUserIds.map(userId => ({
            user: userId,
            title,
            message,
            type: 'system',
            priority
        }));

        await Notification.insertMany(notifications);
        return notifications.length;
    } catch (error) {
        console.error('Failed to send system notifications:', error);
        return 0;
    }
};

module.exports = {
    createNotification,
    getUserNotifications,
    markAsRead,
    markAllAsRead,
    notifyOrderCreated,
    notifyOrderStatusChange,
    sendPromotionalNotification,
    cleanupOldNotifications,
    notifySystemIssue
};