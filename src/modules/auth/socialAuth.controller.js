import passport from 'passport';
import jwt from 'jsonwebtoken';


const googleAuth = passport.authenticate('google', {
    scope: ['profile', 'email']
});


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
                { id: req.user._id },
                process.env.JWT_SECRET,
                { expiresIn: '6h' }
            );


            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 6 * 60 * 60 * 1000,
                sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'none',
                domain: process.env.NODE_ENV === 'production' ? undefined : 'localhost'
            });

            const frontendUrl = process.env.FRONTEND_URL;

            res.redirect(`${frontendUrl}/auth/google/callback?token=${token}`);
        } catch (error) {
            console.error('Google OAuth callback error:', error);
            res.redirect(process.env.FRONTEND_URL ? process.env.FRONTEND_URL + '/auth' : '/auth');
        }
    }
];


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

export { googleAuth, googleCallback, getCurrentUser, logout };
