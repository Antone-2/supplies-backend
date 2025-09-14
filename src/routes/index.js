// index.js
const express = require('express');
const router = express.Router();

router.use('/auth', require('./authRoutes'));
router.use('/cart', require('./cartRoutes'));
router.use('/orders', require('./orderRoutes'));
router.use('/products', require('./productRoutes'));
router.use('/wishlist', require('./wishlistRoutes'));
router.use('/payment', require('./paymentRoutes'));
router.use('/pesapal', require('./pesapalRoutes'));
router.use('/social-auth', require('./socialAuthRoutes'));

module.exports = router;