// authRoutes.js
import express from 'express';
import { register, login, logout, me, refreshToken, forgotPassword, verifyEmail, resetPassword } from '../modules/auth/auth.controller.js';
import { googleAuth, googleCallback } from '../modules/auth/socialAuth.controller.js';
import auth from '../middleware/auth.js';
const router = express.Router();

router.post('/register', register);
router.post('/signup', register); // alias for frontend compatibility

router.post('/login', login);
router.post('/logout', logout);
router.get('/me', me);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

router.get('/verify-email', verifyEmail);

// --- GOOGLE OAUTH ROUTES ---
router.get('/google', googleAuth);
router.get('/google/callback', googleCallback);

export default router;
