import express from 'express';
import {
    getLowStockProducts,
    getOutOfStockProducts,
    bulkCheckLowStock,
    getInventorySummary,
    getLowStockReport
} from '../services/inventoryAlertService.js';
import admin from '../middleware/admin.js';
import jwtAuthMiddleware from '../middleware/jwtAuthMiddleware.js';

const router = express.Router();

// ============================================
// INVENTORY ALERT ROUTES
// ============================================

// Get low stock products
router.get('/low-stock', jwtAuthMiddleware, admin, async (req, res) => {
    try {
        const { threshold } = req.query;
        const result = await getLowStockProducts(threshold ? parseInt(threshold) : null);

        res.json(result);
    } catch (error) {
        console.error('Low stock route error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch low stock products',
            error: error.message
        });
    }
});

// Get out of stock products
router.get('/out-of-stock', jwtAuthMiddleware, admin, async (req, res) => {
    try {
        const result = await getOutOfStockProducts();

        res.json(result);
    } catch (error) {
        console.error('Out of stock route error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch out of stock products',
            error: error.message
        });
    }
});

// Get inventory summary
router.get('/summary', jwtAuthMiddleware, admin, async (req, res) => {
    try {
        const result = await getInventorySummary();

        res.json(result);
    } catch (error) {
        console.error('Inventory summary route error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch inventory summary',
            error: error.message
        });
    }
});

// Get low stock report
router.get('/report/low-stock', jwtAuthMiddleware, admin, async (req, res) => {
    try {
        const result = await getLowStockReport();

        res.json(result);
    } catch (error) {
        console.error('Low stock report route error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate low stock report',
            error: error.message
        });
    }
});

// Trigger bulk low stock check
router.post('/check-low-stock', jwtAuthMiddleware, admin, async (req, res) => {
    try {
        const result = await bulkCheckLowStock();

        res.json({
            success: true,
            message: `Checked ${result.checkedCount} products, sent ${result.alertsSent} alerts`,
            ...result
        });
    } catch (error) {
        console.error('Bulk check route error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check low stock',
            error: error.message
        });
    }
});

export default router;
