/**
 * Keep-Alive Route
 * Pings the server to keep it awake on Render.com free tier
 */

const express = require('express');
const router = express.Router();

/**
 * @route   GET /api/v1/keep-alive
 * @desc    Keep-alive ping to prevent server from sleeping
 * @access  Public
 */
router.get('/keep-alive', (req, res) => {
    res.json({
        success: true,
        message: 'Server is alive',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

/**
 * @route   GET /api/v1/health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
