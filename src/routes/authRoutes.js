// authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../modules/auth/auth.controller');
const auth = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/signup', authController.register); // alias for frontend compatibility

router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/me', auth, authController.me);
router.post('/refresh-token', authController.refreshToken);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.get('/verify-email', authController.verifyEmail);

// Helper endpoints for Cypress testing
router.post('/get-verification-token', authController.getVerificationToken);
router.post('/get-reset-token', authController.getResetToken);


// Google OAuth routes
const passport = require('../../passport');

router.get('/google',
	passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
	passport.authenticate('google', {
		failureRedirect: '/login',
		session: true
	}),
	(req, res) => {
		// Successful authentication, redirect or respond as needed
		res.redirect(process.env.FRONTEND_URL || '/');
	}
);

module.exports = router;
