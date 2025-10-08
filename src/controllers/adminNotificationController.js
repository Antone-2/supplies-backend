const AdminNotification = require('../../Database/models/adminNotification.model');

exports.getNotifications = async (req, res) => {
    try {
        const notifications = await AdminNotification.find().sort({ createdAt: -1 }).limit(100);
        res.json(notifications);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await AdminNotification.findByIdAndUpdate(id, { read: true }, { new: true });
        if (!notification) return res.status(404).json({ error: 'Notification not found' });
        res.json(notification);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.createNotification = async (req, res) => {
    try {
        const { type, message } = req.body;
        const notification = new AdminNotification({ type, message });
        await notification.save();
        res.status(201).json(notification);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await AdminNotification.findByIdAndDelete(id);
        if (!notification) return res.status(404).json({ error: 'Notification not found' });
        res.json({ message: 'Notification deleted' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};