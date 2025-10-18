import Notification from '../../../Database/models/notification.model.js';
import User from '../../../Database/models/user.model.js';

// Get all notifications for the current admin user
export const getNotifications = async (req, res) => {
    try {
        const { page = 1, limit = 20, status, type, priority } = req.query;
        const skip = (page - 1) * limit;

        // Build filter
        const filter = { recipient: req.user.id };
        if (status) filter.status = status;
        if (type) filter.type = type;
        if (priority) filter.priority = priority;

        const notifications = await Notification.find(filter)
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Notification.countDocuments(filter);

        res.json({
            notifications,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ message: 'Failed to fetch notifications' });
    }
};

// Get notification count for header
export const getNotificationCount = async (req, res) => {
    try {
        const count = await Notification.countDocuments({
            recipient: req.user.id,
            status: 'unread'
        });

        res.json({ count });
    } catch (error) {
        console.error('Error fetching notification count:', error);
        res.status(500).json({ message: 'Failed to fetch notification count' });
    }
};

// Create a new notification
export const createNotification = async (req, res) => {
    try {
        const { type, title, message, priority = 'medium', actionUrl, metadata } = req.body;

        // Get all admin users to send notification to all admins
        const adminUsers = await User.find({ role: { $in: ['admin', 'super_admin'] } }).distinct('_id');

        const notifications = adminUsers.map(adminId => ({
            type,
            title,
            message,
            priority,
            actionUrl,
            metadata,
            recipient: adminId,
            createdBy: req.user.id
        }));

        const createdNotifications = await Notification.insertMany(notifications);

        res.status(201).json({
            message: 'Notifications created successfully',
            notifications: createdNotifications
        });
    } catch (error) {
        console.error('Error creating notification:', error);
        res.status(500).json({ message: 'Failed to create notification' });
    }
};

// Mark notification as read
export const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;

        const notification = await Notification.findOneAndUpdate(
            { _id: id, recipient: req.user.id },
            { status: 'read', readAt: new Date() },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        res.json({ message: 'Notification marked as read', notification });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ message: 'Failed to mark notification as read' });
    }
};

// Mark multiple notifications as read
export const markMultipleAsRead = async (req, res) => {
    try {
        const { ids } = req.body;

        const result = await Notification.updateMany(
            { _id: { $in: ids }, recipient: req.user.id },
            { status: 'read', readAt: new Date() }
        );

        res.json({
            message: `${result.modifiedCount} notifications marked as read`
        });
    } catch (error) {
        console.error('Error marking notifications as read:', error);
        res.status(500).json({ message: 'Failed to mark notifications as read' });
    }
};

// Delete notification
export const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;

        const notification = await Notification.findOneAndDelete({
            _id: id,
            recipient: req.user.id
        });

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        res.json({ message: 'Notification deleted successfully' });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ message: 'Failed to delete notification' });
    }
};

// Delete multiple notifications
export const deleteMultipleNotifications = async (req, res) => {
    try {
        const { ids } = req.body;

        const result = await Notification.deleteMany({
            _id: { $in: ids },
            recipient: req.user.id
        });

        res.json({
            message: `${result.deletedCount} notifications deleted successfully`
        });
    } catch (error) {
        console.error('Error deleting notifications:', error);
        res.status(500).json({ message: 'Failed to delete notifications' });
    }
};

// Mark all notifications as read
export const markAllAsRead = async (req, res) => {
    try {
        const result = await Notification.updateMany(
            { recipient: req.user.id, status: 'unread' },
            { status: 'read', readAt: new Date() }
        );

        res.json({
            message: `${result.modifiedCount} notifications marked as read`
        });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ message: 'Failed to mark all notifications as read' });
    }
};
