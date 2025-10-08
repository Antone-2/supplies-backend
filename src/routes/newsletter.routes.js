const express = require('express');
const router = express.Router();
const newsletterController = require('../controllers/newsletter.controller');

// Public routes - basic subscription functionality
router.post('/subscribe',
    newsletterController.validateSubscription,
    newsletterController.subscribe
);

router.get('/unsubscribe/:email', newsletterController.unsubscribe);

// Preference management routes
router.get('/preferences/:email', newsletterController.getPreferences);
router.put('/preferences/:email', newsletterController.updatePreferences);

// Analytics route (for admin)
router.get('/analytics', newsletterController.getAnalytics);

// Admin routes for newsletter campaigns
router.post('/send-campaign', newsletterController.sendTargetedNewsletter);
router.get('/stats', newsletterController.getStats);
router.get('/subscribers', newsletterController.getAllSubscribers);

module.exports = router;