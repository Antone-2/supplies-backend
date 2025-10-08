// newsletterRoutes.js
const express = require('express');
const router = express.Router();
const newsletterController = require('../controllers/newsletterController');
const { isAdmin } = require('../middleware/auth'); // Admin authentication middleware

// Subscribe to newsletter
router.post('/subscribe', newsletterController.subscribe);

// Unsubscribe from newsletter
router.post('/unsubscribe', newsletterController.unsubscribe);

// Get newsletter analytics (admin only)
router.get('/analytics', isAdmin, newsletterController.getAnalytics);

module.exports = router;
