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
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            // Redirect to frontend with token
            const frontendUrl = process.env.FRONTEND_URL;
            res.redirect(`${frontendUrl}/oauth-callback?token=${token}&provider=google`);
        } catch (error) {
            if (process.env.NODE_ENV !== 'production') {
                console.error('Google OAuth callback error:', error);
            }
            res.redirect(process.env.FRONTEND_URL ? process.env.FRONTEND_URL + '/oauth-callback' : '/oauth-callback');
        }
    }
);

module.exports = router;
