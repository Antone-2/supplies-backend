
const Order = require('../../Database/models/order.model.js');
const User = require('../../Database/models/user.model.js');
const { sendOrderReminderEmail, sendCartReminderEmail } = require('./enhancedNotificationService.js');
const { logger } = require('../utils/logger.js');


// Helper function to calculate days ago (calendar days)
const getDaysAgo = (days) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    date.setHours(0, 0, 0, 0);
    return date;
};


const findUsersWithPendingOrders = async (days = 3) => {
    try {
        // Calculate the date X days ago (calendar days)
        const cutoffDate = getDaysAgo(days);

        logger.info(`Finding pending orders older than ${days} days (before ${cutoffDate.toISOString()})`);

        const pendingOrders = await Order.find({
            orderStatus: 'pending',
            paymentStatus: 'pending',
            createdAt: { $lt: cutoffDate }
        }).populate('user', 'email name lastReminderSentAt');

        // Filter out users who were already reminded in the last X days
        const cutoffForReminders = getDaysAgo(days);
        const filteredOrders = pendingOrders.filter(order => {
            if (!order.user || !order.user.email) return false;

            // Include if never reminded or if last reminder was before the cutoff
            if (!order.user.lastReminderSentAt) return true;

            const lastReminder = new Date(order.user.lastReminderSentAt);
            return lastReminder < cutoffForReminders;
        });

        const userOrdersMap = new Map();

        for (const order of filteredOrders) {
            if (order.user && order.user.email) {
                const userId = order.user._id.toString();
                if (!userOrdersMap.has(userId)) {
                    userOrdersMap.set(userId, {
                        user: order.user,
                        orders: []
                    });
                }
                userOrdersMap.get(userId).orders.push(order);
            }
        }

        logger.info(`Found ${userOrdersMap.size} users with pending orders needing reminders`);
        return Array.from(userOrdersMap.values());
    } catch (error) {
        logger.error('Error finding users with pending orders:', error);
        return [];
    }
};


const findUsersWithAbandonedCarts = async (days = 3) => {
    try {
        // Calculate the date X days ago for cart activity
        const cutoffDate = getDaysAgo(days);

        logger.info(`Finding abandoned carts older than ${days} days (before ${cutoffDate.toISOString()})`);

        // Find users who have carts but no orders in the last X days
        const recentOrderUsers = await Order.find({
            createdAt: { $gte: cutoffDate }
        }).distinct('user');

        const usersWithCarts = await User.find({
            _id: { $nin: recentOrderUsers },
            cart: { $exists: true, $ne: [] },
            email: { $exists: true, $ne: null }
        }).select('email name cart lastReminderSentAt');

        // Filter out users who were already reminded in the last X days
        const cutoffForReminders = getDaysAgo(days);
        const filteredUsers = usersWithCarts.filter(user => {
            if (!user.cart || user.cart.length === 0 || !user.email) return false;

            // Include if never reminded or if last reminder was before the cutoff
            if (!user.lastReminderSentAt) return true;

            const lastReminder = new Date(user.lastReminderSentAt);
            return lastReminder < cutoffForReminders;
        });

        logger.info(`Found ${filteredUsers.length} users with abandoned carts needing reminders`);
        return filteredUsers;
    } catch (error) {
        logger.error('Error finding users with abandoned carts:', error);
        return [];
    }
};


const sendPendingOrderReminders = async (days = 3) => {
    try {
        logger.info('Starting pending order reminder job...');

        const usersWithPendingOrders = await findUsersWithPendingOrders(days);
        let sentCount = 0;
        let failedCount = 0;

        for (const { user, orders } of usersWithPendingOrders) {
            try {
                const orderDetails = orders.map(order => ({
                    orderNumber: order.orderNumber,
                    total: order.total,
                    items: order.items.map(item => ({
                        name: item.name,
                        quantity: item.quantity,
                        price: item.price
                    }))
                }));

                await sendOrderReminderEmail({
                    email: user.email,
                    name: user.name,
                    orders: orderDetails,
                    totalAmount: orders.reduce((sum, order) => sum + order.total, 0),
                    orderCount: orders.length
                });

                // Update user's last reminder sent timestamp
                await User.findByIdAndUpdate(user._id, { lastReminderSentAt: new Date() });

                logger.info(`Pending order reminder sent to ${user.email}`);
                sentCount++;
            } catch (error) {
                logger.error(`Failed to send reminder to ${user.email}:`, error);
                failedCount++;
            }
        }

        logger.info(`Pending order reminders completed: ${sentCount} sent, ${failedCount} failed`);
        return { sentCount, failedCount };
    } catch (error) {
        logger.error('Error in sendPendingOrderReminders:', error);
        return { sentCount: 0, failedCount: 0, error: error.message };
    }
};


const sendAbandonedCartReminders = async (days = 3) => {
    try {
        logger.info('Starting abandoned cart reminder job...');

        const usersWithAbandonedCarts = await findUsersWithAbandonedCarts(days);
        let sentCount = 0;
        let failedCount = 0;

        for (const user of usersWithAbandonedCarts) {
            try {
                const cartTotal = user.cart.reduce((sum, item) => {
                    return sum + (item.price || 0) * (item.quantity || 1);
                }, 0);

                await sendCartReminderEmail({
                    email: user.email,
                    name: user.name,
                    cartItems: user.cart.map(item => ({
                        name: item.name,
                        quantity: item.quantity || 1,
                        price: item.price || 0,
                        image: item.image
                    })),
                    cartTotal
                });

                // Update user's last reminder sent timestamp
                await User.findByIdAndUpdate(user._id, { lastReminderSentAt: new Date() });

                logger.info(`Cart reminder sent to ${user.email}`);
                sentCount++;
            } catch (error) {
                logger.error(`Failed to send cart reminder to ${user.email}:`, error);
                failedCount++;
            }
        }

        logger.info(`Cart reminders completed: ${sentCount} sent, ${failedCount} failed`);
        return { sentCount, failedCount };
    } catch (error) {
        logger.error('Error in sendAbandonedCartReminders:', error);
        return { sentCount: 0, failedCount: 0, error: error.message };
    }
};


// New function for day-based reminders (every X calendar days)
const runDayBasedReminders = async (days = 3) => {
    try {
        logger.info(`=== Starting ${days}-Day Reminder Job ===`);
        logger.info(`Time: ${new Date().toISOString()}`);
        logger.info(`Days threshold: ${days}`);

        const pendingResult = await sendPendingOrderReminders(days);
        const cartResult = await sendAbandonedCartReminders(days);

        logger.info(`=== ${days}-Day Reminder Job Completed ===`);
        logger.info(`Pending orders: ${pendingResult.sentCount} sent, ${pendingResult.failedCount} failed`);
        logger.info(`Abandoned carts: ${cartResult.sentCount} sent, ${cartResult.failedCount} failed`);

        return {
            pendingOrders: pendingResult,
            abandonedCarts: cartResult,
            totalSent: pendingResult.sentCount + cartResult.sentCount,
            totalFailed: pendingResult.failedCount + cartResult.failedCount,
            daysThreshold: days
        };
    } catch (error) {
        logger.error('Error in runDayBasedReminders:', error);
        return { error: error.message };
    }
};


// Keep weekly reminders for backward compatibility (every 7 calendar days)
const runWeeklyReminders = async () => {
    return runDayBasedReminders(7);
};


module.exports = {
    sendPendingOrderReminders,
    sendAbandonedCartReminders,
    runDayBasedReminders,
    runWeeklyReminders,
    findUsersWithPendingOrders,
    findUsersWithAbandonedCarts,
    getDaysAgo
};
