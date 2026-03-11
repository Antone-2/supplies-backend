import express from 'express';
import orderController from '../modules/order/order.controller.js';
import jwtAuthMiddleware from '../middleware/jwtAuthMiddleware.js';
import admin from '../middleware/admin.js';

/**
 * ================================================
 * INPUT VALIDATION IMPORTS
 * ================================================
 * Using express-validator for strict input validation
 */
import {
    validateRequest,
    orderValidation,
    objectIdValidation,
    paginationValidation
} from '../middleware/enhancedSecurity.js';

const router = express.Router();


/**
 * ================================================
 * ORDER ROUTES WITH VALIDATION
 * ================================================
 * Order creation requires strict validation
 * Admin operations require authentication + admin role
 */

/**
 * GET / - List all orders (admin only)
 * Query params: page, limit, sort, status
 */
router.get('/', admin, paginationValidation, validateRequest, orderController.getAllOrders);

/**
 * POST / - Create cash order
 * Validation: order items, shipping address
 */
router.post('/', orderValidation, validateRequest, orderController.createCashOrder);

/**
 * POST /create - Create order with payment
 * Validation: order items, shipping address, payment method
 */
router.post('/create', orderValidation, validateRequest, orderController.createOrder);

/**
 * GET /:id - Get specific order
 * Validation: MongoDB ObjectId
 * Both customer (own orders) and admin can access
 */
router.get('/:id', objectIdValidation('id'), validateRequest, orderController.getSpecificOrder);

/**
 * PUT /:id - Update order status (admin only)
 * Validation: MongoDB ObjectId
 */
router.put('/:id', admin, objectIdValidation('id'), validateRequest, orderController.updateOrderStatus);


/**
 * ================================================
 * ORDER STATUS UPDATE ROUTES (ADMIN ONLY)
 * ================================================
 * Each route validates the order ID
 */
router.post('/:id/process', admin, objectIdValidation('id'), validateRequest, orderController.updateOrderStatus);
router.post('/:id/fulfill', admin, objectIdValidation('id'), validateRequest, orderController.updateOrderStatus);
router.post('/:id/ready', admin, objectIdValidation('id'), validateRequest, orderController.updateOrderStatus);
router.post('/:id/pickup', admin, objectIdValidation('id'), validateRequest, orderController.updateOrderStatus);
router.post('/:id/ship', admin, objectIdValidation('id'), validateRequest, orderController.updateOrderStatus);
router.post('/:id/deliver', admin, objectIdValidation('id'), validateRequest, orderController.updateOrderStatus);
router.post('/:id/cancel', admin, objectIdValidation('id'), validateRequest, orderController.updateOrderStatus);



/**
 * ================================================
 * SHIPPING & PAYMENT ROUTES
 * ================================================
 */

/**
 * POST /calculate-shipping - Calculate shipping fee
 */
router.post('/calculate-shipping', orderController.calculateShippingFee);


/**
 * POST /payments/pesapal - Create PesaPal payment
 * Rate limited in server.js
 */
router.post('/payments/pesapal', orderController.createCheckOutSession);

/**
 * POST /create-checkout-session - Create checkout session
 * Rate limited in server.js
 */
router.post('/create-checkout-session', orderController.createCheckOutSession);

/**
 * POST /initiate-payment - Initiate payment
 * Rate limited in server.js
 */
router.post('/initiate-payment', orderController.initiatePayment);


/**
 * ================================================
 * ANALYTICS & BULK OPERATIONS (ADMIN ONLY)
 * ================================================
 */

router.get('/analytics', admin, orderController.getOrderAnalytics);

router.post('/bulk-delete', admin, orderController.bulkDeleteOrders);
router.post('/bulk-update', admin, orderController.bulkUpdateOrders);


/**
 * ================================================
 * ORDER TRACKING
 * ================================================
 */

/**
 * GET /track/:id - Track order by ID
 * Public endpoint for customers to track orders
 * Validation: MongoDB ObjectId
 */
router.get('/track/:id', objectIdValidation('id'), validateRequest, orderController.getSpecificOrder);


/**
 * ================================================
 * PAYMENT STATUS (ADMIN ONLY)
 * ================================================
 */

router.post('/:id/refresh-payment', admin, objectIdValidation('id'), validateRequest, orderController.refreshOrderPaymentStatus);

export default router;
