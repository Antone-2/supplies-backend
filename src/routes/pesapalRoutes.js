import express from 'express';
import { createPesapalPayment, paymentCallback, getPaymentStatus, refreshPaymentStatus, bulkRefreshPaymentStatus } from '../modules/payment/payment.controller.js';

const router = express.Router();

router.post('/initiate', createPesapalPayment);
router.post('/callback', paymentCallback);

// IPN endpoint for PesaPal notifications
router.post('/ipn', paymentCallback);

// Additional IPN endpoint for testing/debugging
router.post('/ipn-test', (req, res) => {
    console.log('🧪 IPN Test endpoint called:', {
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

// Additional endpoints for payment status management
router.get('/status/:orderId', getPaymentStatus);
router.post('/refresh-status/:orderId', refreshPaymentStatus);
router.post('/refresh-status/bulk', bulkRefreshPaymentStatus);

export default router;
