const express = require('express');
const router = express.Router();
const newsletterController = require('../controllers/newsletter.controller');


router.post('/subscribe',
    newsletterController.validateSubscription,
    newsletterController.subscribe
);

router.get('/unsubscribe/:email', newsletterController.unsubscribe);


router.get('/preferences/:email', newsletterController.getPreferences);
router.put('/preferences/:email', newsletterController.updatePreferences);


router.get('/analytics', newsletterController.getAnalytics);


router.post('/send-campaign', newsletterController.sendTargetedNewsletter);
router.get('/stats', newsletterController.getStats);
router.get('/subscribers', newsletterController.getAllSubscribers);

module.exports = router;