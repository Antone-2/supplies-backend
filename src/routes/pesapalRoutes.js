const express = require('express');
const router = express.Router();
const pesapalController = require('../modules/payment/payment.controller');

router.post('/initiate', pesapalController.createPesapalPayment);
router.post('/callback', pesapalController.paymentCallback);

module.exports = router;
