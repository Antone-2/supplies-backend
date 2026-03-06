import AdminNotification from '../../Database/models/adminNotification.model.js';

export const getNotifications = async (req, res) => {
    try {
        const notifications = await AdminNotification.find().sort({ createdAt: -1 }).limit(100);
        const unreadCount = await AdminNotification.countDocuments({ read: false });

        // Transform to match frontend interface
        const transformedNotifications = notifications.map(n => ({
            _id: n._id,
            type: n.type,
            title: n.title || (n.message ? n.message.substring(0, 50) + (n.message.length > 50 ? '...' : '') : 'Notification'),
            message: n.message,
            status: n.read ? 'read' : 'unread',
            priority: n.priority || 'medium',
            createdAt: n.createdAt
        }));

        res.json({
            notifications: transformedNotifications,
            unreadCount: unreadCount
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await AdminNotification.findByIdAndUpdate(id, { read: true }, { new: true });
        if (!notification) return res.status(404).json({ error: 'Notification not found' });
        res.json(notification);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export const createNotification = async (req, res) => {
    try {
        const { type, message, title, priority = 'medium' } = req.body;
        const notification = new AdminNotification({
            type,
            message,
            title: title || message.substring(0, 50) + (message.length > 50 ? '...' : ''),
            priority
        });
        await notification.save();
        res.status(201).json(notification);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await AdminNotification.findByIdAndDelete(id);
        if (!notification) return res.status(404).json({ error: 'Notification not found' });
        res.json({ message: 'Notification deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const markAllAsRead = async (req, res) => {
    try {
        await AdminNotification.updateMany({ read: false }, { read: true });
        res.json({ message: 'All notifications marked as read' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const createAdminNotification = async (type, message, title, priority = 'medium') => {
    try {
        const notification = new AdminNotification({
            type,
            message,
            title: title || message.substring(0, 50) + (message.length > 50 ? '...' : ''),
            priority
        });
        await notification.save();
        return notification;
    } catch (error) {
        console.error('Failed to create admin notification:', error);
        return null;
    }
};

// Seed sample notifications for demo
export const seedNotifications = async (req, res) => {
    try {
        const count = await AdminNotification.countDocuments();
        if (count > 0) {
            return res.json({ message: 'Notifications already exist', count });
        }

        const sampleNotifications = [
            { type: 'order', title: 'New Order Received', message: 'Order #ORDER_123456 has been placed and is awaiting processing.', priority: 'high' },
            { type: 'payment', title: 'Payment Received', message: 'Payment of KES 5,000 received for Order #ORDER_123456.', priority: 'high' },
            { type: 'order', title: 'Order Shipped', message: 'Order #ORDER_123455 has been shipped. Tracking: TRK123456789.', priority: 'medium' },
            { type: 'inventory', title: 'Low Stock Alert', message: 'Product "Stethoscope Classic" is running low on stock (5 remaining).', priority: 'high' },
            { type: 'system', title: 'System Update', message: 'System maintenance scheduled for tonight at 2:00 AM.', priority: 'low' },
            { type: 'order', title: 'Order Delivered', message: 'Order #ORDER_123450 has been successfully delivered to the customer.', priority: 'medium' },
            { type: 'payment', title: 'Payment Failed', message: 'Payment for Order #ORDER_123457 failed. Customer will retry.', priority: 'medium' },
            { type: 'system', title: 'New User Registered', message: 'A new user "john.doe@example.com" has registered on the platform.', priority: 'low' },
        ];

        await AdminNotification.insertMany(sampleNotifications.map(n => ({
            ...n,
            read: Math.random() > 0.5,
            createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
        })));

        res.json({ message: 'Sample notifications created', count: sampleNotifications.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
