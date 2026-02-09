const express = require('express');
const multer = require('multer');
const { exportProducts, importProducts, exportUsers, importUsers, exportOrders, importOrders } = require('../controllers/bulkController');
const admin = require('../middleware/admin');
const router = express.Router();
const upload = multer({ dest: 'uploads/' });


router.get('/products/export', admin, exportProducts);

router.post('/products/import', admin, upload.single('file'), importProducts);


router.get('/users/export', admin, exportUsers);

router.post('/users/import', admin, upload.single('file'), importUsers);


router.get('/orders/export', admin, exportOrders);

router.post('/orders/import', admin, upload.single('file'), importOrders);

module.exports = router;
