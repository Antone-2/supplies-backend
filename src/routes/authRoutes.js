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
        failureRedirect: process.env.FRONTEND_URL ? process.env.FRONTEND_URL + '/auth' : '/auth',
        session: true
    }),
    async (req, res) => {
        try {
            // Generate JWT token for the authenticated user
            const jwt = require('jsonwebtoken');
            const token = jwt.sign(
                { userId: req.user._id, email: req.user.email, role: req.user.role },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '7d' }
            );

            // Redirect to frontend with token
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            res.redirect(`${frontendUrl}/auth?token=${token}&provider=google`);
        } catch (error) {
            console.error('Google OAuth callback error:', error);
            res.redirect(process.env.FRONTEND_URL ? process.env.FRONTEND_URL + '/auth' : '/auth');
        }
    }
);

module.exports = router;
