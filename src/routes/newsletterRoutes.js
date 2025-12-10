import express from 'express';
const router = express.Router();
import newsletterController from '../controllers/newsletterController.js';
import admin from '../middleware/admin.js';


router.post('/subscribe', newsletterController.subscribe);


router.post('/unsubscribe', newsletterController.unsubscribe);


router.get('/analytics', admin, newsletterController.getAnalytics);

export default router;