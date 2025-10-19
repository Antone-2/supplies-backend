import express from 'express';
import orderController from '../modules/order/order.controller.js';
import jwtAuthMiddleware from '../middleware/jwtAuthMiddleware.js';
import admin from '../middleware/admin.js';
const router = express.Router();

router.get('/', admin, orderController.getAllOrders);
router.post('/', jwtAuthMiddleware, orderController.createCashOrder);
router.post('/create', orderController.createOrder); // New endpoint for checkout without auth
router.get('/:id', orderController.getSpecificOrder);
router.put('/:id', admin, orderController.updateOrderStatus);

// Order action endpoints for simple UI
router.post('/:id/process', admin, orderController.processOrder);
router.post('/:id/fulfill', admin, orderController.fulfillOrder);
router.post('/:id/ready', admin, orderController.markReady);
router.post('/:id/pickup', admin, orderController.pickupOrder);
router.post('/:id/ship', admin, orderController.shipOrder);
router.post('/:id/deliver', admin, orderController.deliverOrder);
router.post('/:id/cancel', admin, orderController.cancelOrder);

// Payment endpoints
router.post('/pay/mpesa', jwtAuthMiddleware, orderController.payMpesa);
router.post('/pay/airtel', jwtAuthMiddleware, orderController.payAirtelMoney);

// Shipping calculation
router.post('/calculate-shipping', orderController.calculateShippingFee);

// Pesapal integration
router.post('/payments/pesapal', orderController.createCheckOutSession);
router.post('/create-checkout-session', jwtAuthMiddleware, orderController.createCheckOutSession);
router.post('/initiate-payment', orderController.initiatePayment); // Remove auth requirement for checkout

// Analytics endpoint for admin dashboard
router.get('/analytics', admin, orderController.getOrderAnalytics);

// Admin bulk operations
router.post('/bulk-delete', admin, orderController.bulkDeleteOrders);
router.post('/bulk-update', admin, orderController.bulkUpdateOrders);

// Public tracking endpoint (no authentication required)
router.get('/track/:id', orderController.getSpecificOrder);

export default router;
