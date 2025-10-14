import express from 'express';
import User from '../../Database/models/user.model.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { me, refreshToken, forgotPassword, resetPassword } from '../modules/auth/auth.controller.js';
import admin from '../middleware/admin.js';
import jwtAuthMiddleware from '../middleware/jwtAuthMiddleware.js';

const router = express.Router();

// Admin login - uses same login logic but validates admin role
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Admin login attempt:', { email });

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check if user has admin role
        if (user.role !== 'admin' && user.role !== 'super_admin') {
            return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '6h' });
        const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, { expiresIn: '7d' });

        // Set HTTP-only cookies
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 6 * 60 * 60 * 1000, // 6 hours
            sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax',
            domain: process.env.NODE_ENV === 'production' ? '.medhelmsupplies.co.ke' : undefined
        });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax',
            domain: process.env.NODE_ENV === 'production' ? '.medhelmsupplies.co.ke' : undefined
        });

        res.json({
            token: token, // Include token in response for localStorage backup
            refreshToken: refreshToken, // Include refresh token for localStorage backup
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role,
                permissions: user.permissions || [],
                lastLogin: user.lastLogin || new Date().toISOString(),
                active: user.active !== false
            }
        });
    } catch (error) {
        console.error('Admin login error:', error);
        return res.status(500).json({ message: 'Admin login failed' });
    }
});

// Admin me - requires admin middleware
router.get('/me', jwtAuthMiddleware, admin, me);

// Admin refresh token - does not require access token, only refresh token
router.post('/refresh', refreshToken);

// Admin password reset routes
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
