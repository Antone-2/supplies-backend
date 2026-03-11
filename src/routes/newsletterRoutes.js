import express from 'express';
const router = express.Router();
import newsletterController from '../controllers/newsletterController.js';
import admin from '../middleware/admin.js';

/**
 * ================================================
 * INPUT VALIDATION IMPORTS
 * ================================================
 * Using express-validator for strict input validation
 */
import {
    validateRequest,
    emailValidation
} from '../middleware/enhancedSecurity.js';


/**
 * ================================================
 * NEWSLETTER ROUTES WITH VALIDATION
 * ================================================
 * Newsletter endpoints have strict rate limiting
 * and email validation to prevent abuse
 */

/**
 * POST /subscribe - Subscribe to newsletter
 * Validation: email format only
 * Rate limited globally
 */
router.post('/subscribe', emailValidation, validateRequest, newsletterController.subscribe);


/**
 * POST /unsubscribe - Unsubscribe from newsletter
 * Validation: email format only
 */
router.post('/unsubscribe', emailValidation, validateRequest, newsletterController.unsubscribe);


/**
 * GET /analytics - Get newsletter analytics (admin only)
 */
router.get('/analytics', admin, newsletterController.getAnalytics);

export default router;
