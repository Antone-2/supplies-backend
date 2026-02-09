const Review = require('../../../supplies-backend/Database/models/review.model');
const Notification = require('../../../supplies-backend/Database/models/notification.model');
const Newsletter = require('../../../supplies-backend/Database/models/newsletter.model');


exports.getAllReviews = async (req, res) => {
    const reviews = await Review.find();
    res.json({ reviews });
};


exports.deleteReview = async (req, res) => {
    await Review.findByIdAndDelete(req.params.id);
    res.json({ message: 'Review deleted' });
};


exports.getAllNotifications = async (req, res) => {
    const notifications = await Notification.find();
    res.json({ notifications });
};


exports.deleteNotification = async (req, res) => {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ message: 'Notification deleted' });
};


exports.getAllSubscribers = async (req, res) => {
    const subscribers = await Newsletter.find();
    res.json({ subscribers });
};


exports.removeSubscriber = async (req, res) => {
    await Newsletter.findByIdAndDelete(req.params.id);
    res.json({ message: 'Subscriber removed' });
};
