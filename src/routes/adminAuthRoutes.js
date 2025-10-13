import express from 'express';
import { login, me, refreshToken, forgotPassword, resetPassword } from '../modules/auth/auth.controller.js';
import admin from '../middleware/admin.js';
import jwtAuthMiddleware from '../middleware/jwtAuthMiddleware.js';

const router = express.Router();

// Admin login - uses same login logic but validates admin role
router.post('/login', async (req, res) => {
    try {
        // Use the regular login function
        const loginResult = await login(req, res);

        // If login successful, check if user is admin
        if (res.statusCode === 200) {
            const { user } = JSON.parse(JSON.stringify(loginResult || {}));
            if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
                return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
            }
        }
    } catch (error) {
        // Login failed, return error
        return res.status(error.status || 401).json({ message: error.message || 'Admin login failed' });
    }
});

// Admin me - requires admin middleware
router.get('/me', jwtAuthMiddleware, admin, me);

// Admin refresh token - requires admin middleware
router.post('/refresh', jwtAuthMiddleware, admin, refreshToken);

// Admin password reset routes
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
