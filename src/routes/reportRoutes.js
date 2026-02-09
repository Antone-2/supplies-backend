const express = require('express');
const { getSalesSummary, getUserGrowth, getTopProducts } = require('../controllers/reportController');
const jwtAuthMiddleware = require('../middleware/jwtAuthMiddleware');
const admin = require('../middleware/admin');
const router = express.Router();


router.get('/sales-summary', jwtAuthMiddleware, admin, getSalesSummary);


router.get('/user-growth', jwtAuthMiddleware, admin, getUserGrowth);


router.get('/top-products', jwtAuthMiddleware, admin, getTopProducts);

module.exports = router;
