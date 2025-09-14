const express = require('express');
const router = express.Router();
const orderController = require('../modules/order/order.controller');
const jwtAuthMiddleware = require('../middleware/jwtAuthMiddleware');

router.get('/', orderController.getAllOrders);
router.post('/', jwtAuthMiddleware, orderController.createCashOrder);
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

module.exports = router;
