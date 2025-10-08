const express = require('express');
const { getSalesSummary, getUserGrowth, getTopProducts } = require('../controllers/reportController');
const jwtAuthMiddleware = require('../middleware/jwtAuthMiddleware');
const admin = require('../middleware/admin');
const router = express.Router();

// GET /api/v1/reports/sales-summary
router.get('/sales-summary', jwtAuthMiddleware, admin, getSalesSummary);

// GET /api/v1/reports/user-growth
router.get('/user-growth', jwtAuthMiddleware, admin, getUserGrowth);

// GET /api/v1/reports/top-products
router.get('/top-products', jwtAuthMiddleware, admin, getTopProducts);

module.exports = router;
