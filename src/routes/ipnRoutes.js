import express from 'express';
import { processIPNCallback } from '../services/pesapalIPNService.js';

const router = express.Router();

router.post('/pesapal/ipn', async (req, res) => {
    try {
        console.log('Received PesaPal IPN callback:', req.body);

        const result = await processIPNCallback(req.body);

        if (result.success) {
            res.status(200).json({
                Status: 'success',
                OrderNotificationType: 'IPNRES',
                OrderTrackingId: req.body.OrderTrackingId
            });
        } else {
            res.status(400).json({
                Status: 'error',
                OrderNotificationType: 'IPNERR',
                OrderTrackingId: req.body.OrderTrackingId,
                Error: result.error
            });
        }
    } catch (error) {
        console.error('IPN route error:', error);
        res.status(500).json({
            Status: 'error',
            Error: error.message
        });
    }
});

router.get('/pesapal/verify/:orderTrackingId', async (req, res) => {
    try {
        const { orderTrackingId } = req.params;

        const { getTransactionStatus } = await import('../services/pesapalService.js');
        const transactionStatus = await getTransactionStatus(orderTrackingId);

        res.json({
            success: true,
            transactionStatus
        });
    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;
