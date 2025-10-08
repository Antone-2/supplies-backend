const express = require('express');
const router = express.Router();

router.use('/admin-audit', require('./adminAuditRoutes'));
router.use('/admin-role', require('./adminRoleRoutes'));
router.use('/advanced-report', require('./advancedReportRoutes'));
router.use('/admin-moderation', require('./adminModerationRoutes'));
router.use('/admin-notification', require('./adminNotificationRoutes'));
router.use('/admin-setting', require('./adminSettingRoutes'));
router.use('/admin-user', require('./adminUserRoutes'));

router.use('/auth', require('./authRoutes'));
router.use('/cart', require('./cartRoutes'));
router.use('/orders', require('./orderRoutes'));
router.use('/products', require('./productRoutes'));
router.use('/wishlist', require('./wishlistRoutes'));
router.use('/payment', require('./paymentRoutes'));
router.use('/pesapal', require('./pesapalRoutes'));
router.use('/social-auth', require('./socialAuthRoutes'));
router.use('/reports', require('./reportRoutes'));
router.use('/bulk', require('./bulkRoutes'));
router.use('/gdpr', require('./gdprRoutes'));
router.use('/backup', require('./backupRoutes'));
router.use('/docs', require('./swaggerRoutes'));
router.use('/general-reviews', require('./generalReviewRoutes'));

module.exports = router;
