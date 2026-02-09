const express = require('express');
const admin = require('../middleware/admin');
const { getAllReviews, deleteReview, getAllNotifications, deleteNotification, getAllSubscribers, removeSubscriber } = require('../controllers/adminModerationController');
const router = express.Router();


router.get('/reviews', admin, getAllReviews);
router.delete('/reviews/:id', admin, deleteReview);


router.get('/notifications', admin, getAllNotifications);
router.delete('/notifications/:id', admin, deleteNotification);


router.get('/newsletter', admin, getAllSubscribers);
router.delete('/newsletter/:id', admin, removeSubscriber);

module.exports = router;
