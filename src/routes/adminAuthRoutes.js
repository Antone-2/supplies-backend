import express from 'express';
import User from '../../../supplies-backend/Database/models/user.model.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import * as emailService from '../services/emailService.js';
import { me, refreshToken, forgotPassword, resetPassword } from '../modules/auth/auth.controller.js';
import admin from '../middleware/admin.js';
import jwtAuthMiddleware from '../middleware/jwtAuthMiddleware.js';

const router = express.Router();


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


        if (user.role !== 'admin' && user.role !== 'super_admin') {
            return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '6h' });
        const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, { expiresIn: '7d' });


        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 6 * 60 * 60 * 1000,
            sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax',
            domain: process.env.NODE_ENV === 'production' ? '.Medhelmsupplies.co.ke' : undefined
        });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax',
            domain: process.env.NODE_ENV === 'production' ? '.Medhelmsupplies.co.ke' : undefined
        });

        res.json({
            token: token,
            refreshToken: refreshToken,
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


router.get('/me', jwtAuthMiddleware, async (req, res) => {
    try {

        let token = req.cookies.token;


        if (!token && req.headers.authorization) {
            const authHeader = req.headers.authorization;
            if (authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7);
            }
        }

        if (!token) {
            return res.status(401).json({ message: 'Authorization token missing' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }


        if (user.role !== 'admin' && user.role !== 'super_admin') {
            console.warn(`User ${user.email} attempted admin access but has role: ${user.role}`);

        }

        res.json({
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role || 'user',
                phone: user.phone,
                address: user.address,
                permissions: user.permissions || [],
                lastLogin: user.lastLogin || new Date().toISOString(),
                active: user.active !== false
            }
        });
    } catch (err) {
        console.error('Admin /me endpoint error:', err);
        res.status(500).json({ message: 'Failed to get user' });
    }
});


router.post('/refresh', refreshToken);


router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }


        if (user.role !== 'admin' && user.role !== 'super_admin') {
            return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }


        const resetToken = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000;
        await user.save();


        const resetUrl = `${process.env.FRONTEND_URL}/admin/reset-password?token=${resetToken}`;
        const logoUrl = process.env.LOGO_URL;
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; border: 1px solid #eee; border-radius: 8px; padding: 24px;">
                <div style="text-align: center; margin-bottom: 16px;">
                    <img src="${logoUrl}" alt="Medhelm Supplies Logo" style="height: 60px; margin-bottom: 8px;" />
                    <h2 style="color: #2563eb; margin: 0;">Medhelm Supplies</h2>
                    <p style="color: #666; font-size: 14px; margin: 4px 0 0;">Administrator Portal</p>
                </div>
                <p>Hello ${user.name},</p>
                <p>You requested a password reset for your admin account. Click the link below to reset your password:</p>
                <div style="text-align: center; margin: 24px 0;">
                    <a href="${resetUrl}" style="background: #2563eb; color: #fff; padding: 12px 24px; border-radius: 4px; text-decoration: none;">Reset Admin Password</a>
                </div>
                <p>This link will expire in 1 hour. If you did not request this, you can ignore this email.</p>
                <p style="font-size: 12px; color: #888;">Medhelm Supplies Admin Portal &copy; 2025</p>
            </div>
        `;
        await emailService.sendEmail(email, 'Reset your admin password', html);
        res.json({ message: 'Password reset email sent! Please check your inbox and click the link to reset your password.' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to send password reset email' });
    }
});

router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res.status(400).json({ message: 'Token and new password are required' });
        }

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }


        if (user.role !== 'admin' && user.role !== 'super_admin') {
            return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }


        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ message: 'Password reset successful! You can now log in with your new password.' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to reset password' });
    }
});

export default router;