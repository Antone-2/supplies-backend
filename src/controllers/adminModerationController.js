const Review = require('../../Database/models/review.model');
const Notification = require('../../Database/models/notification.model');
const Newsletter = require('../../Database/models/newsletter.model');

// Admin: Get all reviews
exports.getAllReviews = async (req, res) => {
    const reviews = await Review.find();
    res.json({ reviews });
};

// Admin: Delete review
exports.deleteReview = async (req, res) => {
    await Review.findByIdAndDelete(req.params.id);
    res.json({ message: 'Review deleted' });
};

// Admin: Get all notifications
exports.getAllNotifications = async (req, res) => {
    const notifications = await Notification.find();
    res.json({ notifications });
};

// Admin: Delete notification
exports.deleteNotification = async (req, res) => {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ message: 'Notification deleted' });
};

// Admin: Get all newsletter subscribers
exports.getAllSubscribers = async (req, res) => {
    const subscribers = await Newsletter.find();
    res.json({ subscribers });
};

// Admin: Remove subscriber
exports.removeSubscriber = async (req, res) => {
    await Newsletter.findByIdAndDelete(req.params.id);
    res.json({ message: 'Subscriber removed' });
};
