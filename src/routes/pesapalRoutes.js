import express from 'express';
import { createPesapalPayment, paymentCallback } from '../modules/payment/payment.controller.js';

const router = express.Router();

router.post('/initiate', createPesapalPayment);
router.post('/callback', paymentCallback);

export default router;
