import express from 'express';
import { createPesapalPayment, createOrderAndPayment, paymentCallback, getPaymentStatus, refreshPaymentStatus, bulkRefreshPaymentStatus } from '../modules/payment/payment.controller.js';
import jwtAuthMiddleware from '../middleware/jwtAuthMiddleware.js';

const router = express.Router();

router.post('/initiate', createPesapalPayment);
router.post('/create-order-and-payment', jwtAuthMiddleware, createOrderAndPayment);
router.post('/callback', paymentCallback);


router.post('/ipn', paymentCallback);


router.post('/ipn-test', (req, res) => {
    console.log(' IPN Test endpoint called:', {
        method: req.method,
        body: req.body,
        query: req.query,
        headers: req.headers,
        timestamp: new Date().toISOString()
    });
    res.json({
        success: true,
        message: 'IPN test endpoint reached',
        receivedData: req.body,
        receivedQuery: req.query
    });
});


router.get('/status/:orderId', getPaymentStatus);
router.post('/refresh-status/:orderId', refreshPaymentStatus);
router.post('/refresh-status/bulk', bulkRefreshPaymentStatus);

export default router;