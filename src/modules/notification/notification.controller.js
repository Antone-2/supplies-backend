const mongoose = require('mongoose');
const Notification = require('../../../Database/models/notification.model');
const AppError = require('../../utils/AppError');
const catchAsyncError = (fn) => {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
};

// Additional imports for email and SMS sending
const { sendEmail } = require('../../utils/emailService');
const { sendSMS } = require('../../utils/smsService');

// Helper function to send notification via email with logo and proper from name
const sendEmailNotification = async (user, title, message) => {
    const logoUrl = 'https://medhelmsupplies.co.ke/medhelm-logo.png'; // Your logo URL
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; border: 1px solid #eee; border-radius: 8px; padding: 24px;">
            <div style="text-align: center; margin-bottom: 16px;">
                <img src="${logoUrl}" alt="Medhelm Supplies Logo" style="height: 60px; margin-bottom: 8px;" />
                <h2 style="color: #2563eb; margin: 0;">Medhelm Supplies</h2>
            </div>
            <h3>${title}</h3>
            <p>${message}</p>
            <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
            <p style="font-size: 12px; color: #888; text-align: center;">&copy; ${new Date().getFullYear()} Medhelm Supplies</p>
        </div>
    `;
    await sendEmail(user.email, title, html);
};

// Helper function to send notification via SMS with only "Medhelm Supplies" as sender
const sendSMSNotification = async (user, message) => {
    await sendSMS(user.phoneNumber, message);
};

// Get all notifications for a user
exports.getUserNotifications = catchAsyncError(async (req, res, next) => {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const notifications = await Notification.find({ user: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name email');

    const total = await Notification.countDocuments({ user: userId });
    const unreadCount = await Notification.countDocuments({ user: userId, isRead: false });

    res.status(200).json({
        success: true,
        data: {
            notifications,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalNotifications: total,
                hasNextPage: page * limit < total,
                hasPrevPage: page > 1
            },
            unreadCount
        }
    });
});

// Get single notification
exports.getNotification = catchAsyncError(async (req, res, next) => {
    const notification = await Notification.findById(req.params.id)
        .populate('user', 'name email');

    if (!notification) {
        return next(new AppError('Notification not found', 404));
    }

    // Check if user owns this notification
    if (notification.user.toString() !== req.user.id) {
        return next(new AppError('You do not have permission to view this notification', 403));
    }

    res.status(200).json({
        success: true,
        data: notification
    });
});

// Create notification
exports.createNotification = catchAsyncError(async (req, res, next) => {
    const { title, message, type, priority, data, userId, via } = req.body;

    const notification = await Notification.create({
        user: userId || req.user.id,
        title,
        message,
        type: type || 'general',
        priority: priority || 'medium',
        data: data || {}
    });

    await notification.populate('user', 'name email phoneNumber');

    // Send notification via email or SMS based on 'via' parameter
    if (via === 'email') {
        try {
            await sendEmailNotification(notification.user, title, message);
        } catch (err) {
            console.error('Error sending email notification:', err);
        }
    } else if (via === 'sms') {
        try {
            await sendSMSNotification(notification.user, message);
        } catch (err) {
            console.error('Error sending SMS notification:', err);
        }
    }

    res.status(201).json({
        success: true,
        data: notification
    });
});

// Mark notification as read
exports.markAsRead = catchAsyncError(async (req, res, next) => {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
        return next(new AppError('Notification not found', 404));
    }

    // Check if user owns this notification
    if (notification.user.toString() !== req.user.id) {
        return next(new AppError('You do not have permission to modify this notification', 403));
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json({
        success: true,
        data: notification
    });
});

// Mark all notifications as read for a user
exports.markAllAsRead = catchAsyncError(async (req, res, next) => {
    const result = await Notification.updateMany(
        { user: req.user.id, isRead: false },
        { isRead: true }
    );

    res.status(200).json({
        success: true,
        message: `${result.modifiedCount} notifications marked as read`
    });
});

// Delete notification
exports.deleteNotification = catchAsyncError(async (req, res, next) => {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
        return next(new AppError('Notification not found', 404));
    }

    // Check if user owns this notification
    if (notification.user.toString() !== req.user.id) {
        return next(new AppError('You do not have permission to delete this notification', 403));
    }

    await Notification.findByIdAndDelete(req.params.id);

    res.status(200).json({
        success: true,
        message: 'Notification deleted successfully'
    });
});

// Delete all read notifications for a user
exports.deleteReadNotifications = catchAsyncError(async (req, res, next) => {
    const result = await Notification.deleteMany({
        user: req.user.id,
        isRead: true
    });

    res.status(200).json({
        success: true,
        message: `${result.deletedCount} read notifications deleted`
    });
});

// Get notification statistics
exports.getNotificationStats = catchAsyncError(async (req, res, next) => {
    const userId = req.user.id;

    const stats = await Notification.aggregate([
        { $match: { user: mongoose.Types.ObjectId(userId) } },
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                unread: { $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] } },
                byType: {
                    $push: {
                        type: '$type',
                        isRead: '$isRead'
                    }
                }
            }
        }
    ]);

    const typeStats = {};
    if (stats.length > 0) {
        stats[0].byType.forEach(item => {
            if (!typeStats[item.type]) {
                typeStats[item.type] = { total: 0, unread: 0 };
            }
            typeStats[item.type].total++;
            if (!item.isRead) {
                typeStats[item.type].unread++;
            }
        });
    }

    res.status(200).json({
        success: true,
        data: {
            total: stats[0]?.total || 0,
            unread: stats[0]?.unread || 0,
            byType: typeStats
        }
    });
});

// Send bulk notifications (admin only)
exports.sendBulkNotification = catchAsyncError(async (req, res, next) => {
    const { title, message, type, priority, userIds } = req.body;

    if (!userIds || !Array.isArray(userIds)) {
        return next(new AppError('userIds array is required', 400));
    }

    const notifications = userIds.map(userId => ({
        user: userId,
        title,
        message,
        type: type || 'general',
        priority: priority || 'medium'
    }));

    const createdNotifications = await Notification.insertMany(notifications);

    res.status(201).json({
        success: true,
        message: `${createdNotifications.length} notifications sent successfully`,
        data: createdNotifications
    });
});
