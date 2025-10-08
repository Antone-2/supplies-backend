const express = require('express');
const multer = require('multer');
const { exportProducts, importProducts, exportUsers, importUsers, exportOrders, importOrders } = require('../controllers/bulkController');
const admin = require('../middleware/admin');
const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Export products to CSV
router.get('/products/export', admin, exportProducts);
// Import products from CSV
router.post('/products/import', admin, upload.single('file'), importProducts);

// Export users to CSV
router.get('/users/export', admin, exportUsers);
// Import users from CSV
router.post('/users/import', admin, upload.single('file'), importUsers);

// Export orders to CSV
router.get('/orders/export', admin, exportOrders);
// Import orders from CSV
router.post('/orders/import', admin, upload.single('file'), importOrders);

module.exports = router;
