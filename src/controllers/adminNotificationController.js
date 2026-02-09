import AdminNotification from '../../../supplies-backend/Database/models/adminNotification.model.js';

export const getNotifications = async (req, res) => {
    try {
        const notifications = await AdminNotification.find().sort({ createdAt: -1 }).limit(100);
        res.json(notifications);
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
        res.status(400).json({ error: err.message });
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
