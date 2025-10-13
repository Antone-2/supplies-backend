import express from 'express';
import { createPesapalPayment, paymentCallback } from '../modules/payment/payment.controller.js';

const router = express.Router();

router.post('/initiate', createPesapalPayment);
router.post('/callback', paymentCallback);

// IPN endpoint for PesaPal notifications
router.post('/ipn', paymentCallback);

export default router;
