import express from 'express';
import { runDayBasedReminders, runWeeklyReminders, sendPendingOrderReminders, sendAbandonedCartReminders } from '../services/cartAbandonmentService.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * @route   POST /api/v1/reminders/run-day-based
 * @desc    Trigger reminders for orders/carts older than specified days
 * @access  Admin
 */
router.post('/run-day-based', async (req, res) => {
    try {
        const { days = 3 } = req.body;
        logger.info(`Manual ${days}-day reminder trigger requested`);

        const result = await runDayBasedReminders(days);

        res.json({
            success: true,
            message: `${days}-day reminders processed`,
            ...result
        });
    } catch (error) {
        logger.error('Error running day-based reminders:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   POST /api/v1/reminders/run-3-day
 * @desc    Trigger 3-day reminders (convenience endpoint)
 * @access  Admin
 */
router.post('/run-3-day', async (req, res) => {
    try {
        logger.info('Manual 3-day reminder trigger requested');

        const result = await runDayBasedReminders(3);

        res.json({
            success: true,
            message: '3-day reminders processed',
            ...result
        });
    } catch (error) {
        logger.error('Error running 3-day reminders:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   POST /api/v1/reminders/run-weekly
 * @desc    Trigger weekly reminders (every 7 days)
 * @access  Admin
 */
router.post('/run-weekly', async (req, res) => {
    try {
        logger.info('Manual weekly reminder trigger requested');

        const result = await runWeeklyReminders();

        res.json({
            success: true,
            message: 'Weekly reminders processed',
            ...result
        });
    } catch (error) {
        logger.error('Error running weekly reminders:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   POST /api/v1/reminders/pending-orders
 * @desc    Send reminders for pending orders
 * @access  Admin
 */
router.post('/pending-orders', async (req, res) => {
    try {
        const { days = 3 } = req.body;
        logger.info('Pending order reminders requested');

        const result = await sendPendingOrderReminders(days);

        res.json({
            success: true,
            message: 'Pending order reminders processed',
            ...result
        });
    } catch (error) {
        logger.error('Error sending pending order reminders:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   POST /api/v1/reminders/abandoned-carts
 * @desc    Send reminders for abandoned carts
 * @access  Admin
 */
router.post('/abandoned-carts', async (req, res) => {
    try {
        const { days = 3 } = req.body;
        logger.info('Abandoned cart reminders requested');

        const result = await sendAbandonedCartReminders(days);

        res.json({
            success: true,
            message: 'Abandoned cart reminders processed',
            ...result
        });
    } catch (error) {
        logger.error('Error sending abandoned cart reminders:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   GET /api/v1/reminders/status
 * @desc    Get reminder service status and configuration
 * @access  Public
 */
router.get('/status', async (req, res) => {
    res.json({
        success: true,
        message: 'Reminder service is configured',
        schedule: 'Every 3 days (at 9:00 AM & 5:00 PM Africa/Nairobi)',
        threshold: '3 days',
        endpoints: {
            'POST /api/v1/reminders/run-3-day': 'Trigger 3-day reminders',
            'POST /api/v1/reminders/run-day-based': 'Trigger reminders (body: { days: number })',
            'POST /api/v1/reminders/run-weekly': 'Trigger weekly reminders',
            'POST /api/v1/reminders/pending-orders': 'Pending orders only',
            'POST /api/v1/reminders/abandoned-carts': 'Abandoned carts only',
            'GET /api/v1/reminders/status': 'Service status'
        }
    });
});

export default router;
