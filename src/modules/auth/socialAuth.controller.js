const passport = require('passport');
const jwt = require('jsonwebtoken');

// Google OAuth authentication
const googleAuth = passport.authenticate('google', {
    scope: ['profile', 'email']
});

// Google OAuth callback
const googleCallback = [
    passport.authenticate('google', {
        failureRedirect: process.env.FRONTEND_URL ? process.env.FRONTEND_URL + '/auth' : '/auth',
        session: true
    }),
    async (req, res) => {
        try {
            if (!req.user) throw new Error('No user from Google OAuth');
            if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET not set in environment');
            const token = jwt.sign(
                { userId: req.user._id, email: req.user.email, role: req.user.role },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );
            const frontendUrl = process.env.FRONTEND_URL;
            // Always redirect to homepage with token and provider info
            res.redirect(`${frontendUrl}/?token=${token}&provider=google`);
        } catch (error) {
            console.error('Google OAuth callback error:', error);
            res.redirect(process.env.FRONTEND_URL ? process.env.FRONTEND_URL + '/auth' : '/auth');
        }
    }
];

// Get current user
const getCurrentUser = (req, res) => {
    if (req.user) {
        res.json({
            status: 'success',
            data: {
                user: req.user
            }
        });
    } else {
        res.status(401).json({
            status: 'error',
            message: 'Not authenticated'
        });
    }
};

// Logout
const logout = (req, res) => {
    req.logout((err) => {
        if (err) {
            return res.status(500).json({
                status: 'error',
                message: 'Logout failed'
            });
        }
        res.json({
            status: 'success',
            message: 'Logged out successfully'
        });
    });
};

module.exports = { googleAuth, googleCallback, getCurrentUser, logout };
