const express = require('express');
const admin = require('../middleware/admin');
const { getSummary, getRevenueByPeriod, getTopCustomers, getInventoryAlerts } = require('../controllers/advancedReportController');
const router = express.Router();

router.get('/summary', admin, getSummary);
router.get('/revenue', admin, getRevenueByPeriod);
router.get('/top-customers', admin, getTopCustomers);
router.get('/inventory-alerts', admin, getInventoryAlerts);

module.exports = router;
