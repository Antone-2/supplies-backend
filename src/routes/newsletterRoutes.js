// newsletterRoutes.js
import express from 'express';
const router = express.Router();
import newsletterController from '../controllers/newsletterController.js';
import admin from '../middleware/admin.js'; // Admin authentication middleware

// Subscribe to newsletter
router.post('/subscribe', newsletterController.subscribe);

// Unsubscribe from newsletter
router.post('/unsubscribe', newsletterController.unsubscribe);

// Get newsletter analytics (admin only)
router.get('/analytics', admin, newsletterController.getAnalytics);

export default router;
