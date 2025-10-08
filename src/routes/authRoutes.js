// authRoutes.js
const express = require('express');
const { register, login, logout, me, refreshToken, forgotPassword, verifyEmail, resetPassword } = require('../modules/auth/auth.controller');
const { googleAuth, googleCallback } = require('../modules/auth/socialAuth.controller');
const auth = require('../middleware/auth');
const router = express.Router();

router.post('/register', register);
router.post('/signup', register); // alias for frontend compatibility

router.post('/login', login);
router.post('/logout', logout);
router.get('/me', auth, me);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

router.get('/verify-email', verifyEmail);

// --- GOOGLE OAUTH ROUTES ---
router.get('/google', googleAuth);
router.get('/google/callback', googleCallback);

export default router;
