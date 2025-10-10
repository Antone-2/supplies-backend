// newsletterRoutes.js
import express from 'express';
const router = express.Router();
import newsletterController from '../controllers/newsletterController.js';
import { isAdmin } from '../middleware/auth.js'; // Admin authentication middleware

// Subscribe to newsletter
router.post('/subscribe', newsletterController.subscribe);

// Unsubscribe from newsletter
router.post('/unsubscribe', newsletterController.unsubscribe);

// Get newsletter analytics (admin only)
router.get('/analytics', isAdmin, newsletterController.getAnalytics);

export default router;
