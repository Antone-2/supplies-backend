const express = require('express');
const router = express.Router();
const paymentController = require('../modules/payment/payment.controller');

router.post('/pesapal', paymentController.createPesapalPayment);
router.post('/mpesa', paymentController.payWithMpesa);
router.post('/airtel', paymentController.payWithAirtel);
router.post('/paypal', paymentController.payWithPaypal);
router.post('/callback', paymentController.paymentCallback);
router.get('/status/:orderId', paymentController.getPaymentStatus);

module.exports = router;
