const passport = require('passport');

// Google OAuth authentication
exports.googleAuth = passport.authenticate('google', {
    scope: ['profile', 'email']
});

// Google OAuth callback
exports.googleCallback = passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        // Successful authentication, redirect to frontend
        res.redirect(process.env.FRONTEND_URL);
    };

// Get current user
exports.getCurrentUser = (req, res) => {
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
exports.logout = (req, res) => {
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
