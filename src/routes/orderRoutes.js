const express = require('express');
const orderController = require('../modules/order/order.controller');
const jwtAuthMiddleware = require('../middleware/jwtAuthMiddleware');
const router = express.Router();

router.get('/', orderController.getAllOrders);
router.post('/', jwtAuthMiddleware, orderController.createCashOrder);
router.post('/create', orderController.createOrder); // New endpoint for checkout without auth
router.get('/:id', orderController.getSpecificOrder);
router.put('/:id', orderController.updateOrderStatus);

// Payment endpoints
router.post('/pay/mpesa', jwtAuthMiddleware, orderController.payMpesa);
router.post('/pay/airtel', jwtAuthMiddleware, orderController.payAirtelMoney);

// Shipping calculation
router.post('/calculate-shipping', orderController.calculateShippingFee);

// Pesapal integration
router.post('/payments/pesapal', orderController.createCheckOutSession);
router.post('/create-checkout-session', jwtAuthMiddleware, orderController.createCheckOutSession);

// Analytics endpoint for admin dashboard
router.get('/analytics', orderController.getOrderAnalytics);

// Public tracking endpoint (no authentication required)
router.get('/track/:id', orderController.getSpecificOrder);

module.exports = router;
