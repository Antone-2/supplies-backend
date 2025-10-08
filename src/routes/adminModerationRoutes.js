const express = require('express');
const admin = require('../middleware/admin');
const { getAllReviews, deleteReview, getAllNotifications, deleteNotification, getAllSubscribers, removeSubscriber } = require('../controllers/adminModerationController');
const router = express.Router();

// Reviews moderation
router.get('/reviews', admin, getAllReviews);
router.delete('/reviews/:id', admin, deleteReview);

// Notifications moderation
router.get('/notifications', admin, getAllNotifications);
router.delete('/notifications/:id', admin, deleteNotification);

// Newsletter moderation
router.get('/newsletter', admin, getAllSubscribers);
router.delete('/newsletter/:id', admin, removeSubscriber);

module.exports = router;
