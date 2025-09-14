// socialAuthRoutes.js
const express = require('express');
const router = express.Router();
const socialAuthController = require('../modules/auth/socialAuth.controller');

router.get('/google', socialAuthController.googleAuth);
router.get('/google/callback', socialAuthController.googleCallback);

module.exports = router;