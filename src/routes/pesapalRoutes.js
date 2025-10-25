import express from 'express';
import { createPesapalPayment, paymentCallback, getPaymentStatus, refreshPaymentStatus } from '../modules/payment/payment.controller.js';

const router = express.Router();

router.post('/initiate', createPesapalPayment);
router.post('/callback', paymentCallback);

// IPN endpoint for PesaPal notifications
router.post('/ipn', paymentCallback);

// Additional endpoints for payment status management
router.get('/status/:orderId', getPaymentStatus);
router.post('/refresh-status/:orderId', refreshPaymentStatus);

export default router;
