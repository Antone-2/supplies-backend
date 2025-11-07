import User from '../../../Database/models/user.model.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import * as emailService from '../../services/emailService.js';

const register = async function register(req, res) {
    console.log('Register endpoint hit', req.body);
    console.log('Registration input:', { email: req.body.email, name: req.body.name });
    try {
        const { email, password, name } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already exists. Please use a different email or log in.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const user = new User({ email, password: hashedPassword, name, isVerified: false, verificationToken });
        await user.save();
        console.log('User saved:', user);
        const verificationUrl = `${process.env.BACKEND_URL}/api/v1/auth/verify-email?token=${verificationToken}`;
        const logoUrl = process.env.LOGO_URL;
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; border: 1px solid #eee; border-radius: 8px; padding: 24px;">
                <div style="text-align: center; margin-bottom: 16px;">
                    <img src="${logoUrl}" alt="Medhelm Supplies Logo" style="height: 60px; margin-bottom: 8px;" />
                    <h2 style="color: #2563eb; margin: 0;">Medhelm Supplies</h2>
                </div>
                <p>Hello ${name},</p>
                <p>Thank you for registering. Please verify your email by clicking the link below:</p>
                <div style="text-align: center; margin: 24px 0;">
                    <a href="${verificationUrl}" style="background: #2563eb; color: #fff; padding: 12px 24px; border-radius: 4px; text-decoration: none;">Verify Email</a>
                </div>
                <p>If you did not sign up, you can ignore this email.</p>
                <p style="font-size: 12px; color: #888;">Medhelm Supplies &copy; 2025</p>
            </div>
        `;
        await emailService.sendEmail(email, 'Verify your email', html);
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '6h' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 6 * 60 * 60 * 1000, 
            sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax',
            domain: process.env.NODE_ENV === 'production' ? '.medhelmsupplies.co.ke' : undefined
        });

        res.status(201).json({
            message: 'Registration successful! You are now logged in. Please check your email to verify your account.',
            token: token, 
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role || 'user',
                phone: user.phone,
                address: user.address
            }
        });
    } catch (err) {
        console.log('Registration error:', err);
        // Handle duplicate email error
        if (err.code === 11000 && err.keyValue && err.keyValue.email) {
            return res.status(400).json({ message: 'Email already exists. Please use a different email or log in.' });
        }
        res.status(400).json({ message: err.message || 'Registration failed' });
    }
};

// Email verification endpoint (moved out of register)
const verifyEmail = async function verifyEmail(req, res) {
    try {
        const { token } = req.query;
        if (!token) {
            return res.redirect(`${process.env.FRONTEND_URL}/account-verified?error=missing_token`);
        }
        const user = await User.findOne({ verificationToken: token });
        if (!user) {
            return res.redirect(`${process.env.FRONTEND_URL}/account-verified?error=invalid_token`);
        }
        user.isVerified = true;
        user.verificationToken = undefined;
        await user.save();
        res.redirect(`${process.env.FRONTEND_URL}/account-verified?success=true`);
    } catch (err) {
        console.error('Verification error:', err);
        res.redirect(`${process.env.FRONTEND_URL}/account-verified?error=server_error`);
    }
};
// Email verification endpoint

const login = async function login(req, res) {
    try {
        const { email, password } = req.body;
        console.log('Login attempt:', { email });
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
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
                role: user.role || 'user',
                phone: user.phone,
                address: user.address
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Login failed' });
    }
};

const logout = async function logout(req, res) {
    // Clear the token cookie
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'none',
        domain: process.env.NODE_ENV === 'production' ? '.medhelmsupplies.co.ke' : undefined
    });
    res.json({ message: 'Logged out successfully' });
};

const me = async function me(req, res) {
    try {
        // Check for token in multiple places for cross-domain compatibility
        let token = req.cookies.token;

        // If no cookie token, check Authorization header
        if (!token && req.headers.authorization) {
            const authHeader = req.headers.authorization;
            if (authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7); // Remove 'Bearer ' prefix
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
        res.json({
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role || 'user',
                phone: user.phone,
                address: user.address
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Failed to get user' });
    }
};

const refreshToken = async function refreshToken(req, res) {
    try {
        // Get refresh token from cookie, Authorization header, or request body
        let refreshToken = req.cookies.refreshToken;

        // If no cookie refresh token, check Authorization header
        if (!refreshToken && req.headers.authorization) {
            const authHeader = req.headers.authorization;
            if (authHeader.startsWith('Bearer ')) {
                refreshToken = authHeader.substring(7); // Remove 'Bearer ' prefix
            }
        }

        // If still no refresh token, check request body (for admin refresh)
        if (!refreshToken && req.body.refreshToken) {
            refreshToken = req.body.refreshToken;
        }

        if (!refreshToken) {
            return res.status(401).json({ message: 'Refresh token missing' });
        }

        // Verify refresh token
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if user has admin role for admin routes
        if (req.originalUrl.includes('/admin/') && user.role !== 'admin' && user.role !== 'super_admin') {
            return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }

        // Generate new tokens
        const newToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '6h' });
        const newRefreshToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, { expiresIn: '7d' });

        // Set new cookies
        res.cookie('token', newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 6 * 60 * 60 * 1000, // 6 hours
            sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax',
            domain: process.env.NODE_ENV === 'production' ? '.medhelmsupplies.co.ke' : undefined
        });

        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax',
            domain: process.env.NODE_ENV === 'production' ? '.medhelmsupplies.co.ke' : undefined
        });

        res.json({
            token: newToken, // Include in response for localStorage backup
            refreshToken: newRefreshToken, // Include in response for localStorage backup
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role || 'user',
                phone: user.phone,
                address: user.address
            }
        });
    } catch (err) {
        console.error('Refresh token error:', err);
        // Clear cookies on refresh failure
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax',
            domain: process.env.NODE_ENV === 'production' ? '.medhelmsupplies.co.ke' : undefined
        });
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax',
            domain: process.env.NODE_ENV === 'production' ? '.medhelmsupplies.co.ke' : undefined
        });
        res.status(500).json({ message: 'Failed to refresh token' });
    }
};

const forgotPassword = async function forgotPassword(req, res) {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();

        // Send reset email
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
        const logoUrl = process.env.LOGO_URL;
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; border: 1px solid #eee; border-radius: 8px; padding: 24px;">
                <div style="text-align: center; margin-bottom: 16px;">
                    <img src="${logoUrl}" alt="Medhelm Supplies Logo" style="height: 60px; margin-bottom: 8px;" />
                    <h2 style="color: #2563eb; margin: 0;">Medhelm Supplies</h2>
                </div>
                <p>Hello ${user.name},</p>
                <p>You requested a password reset. Click the link below to reset your password:</p>
                <div style="text-align: center; margin: 24px 0;">
                    <a href="${resetUrl}" style="background: #2563eb; color: #fff; padding: 12px 24px; border-radius: 4px; text-decoration: none;">Reset Password</a>
                </div>
                <p>This link will expire in 1 hour. If you did not request this, please ignore this email.</p>
                <p style="font-size: 12px; color: #888;">Medhelm Supplies &copy; 2025</p>
            </div>
        `;
        await emailService.sendEmail(email, 'Reset your password', html);
        res.json({ message: 'Password reset email sent! Please check your inbox and click the link to reset your password.' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to send password reset email' });
    }
};

const resetPassword = async function resetPassword(req, res) {
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

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ message: 'Password reset successful! You can now log in with your new password.' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to reset password' });
    }
};

export { register, verifyEmail, login, logout, me, refreshToken, forgotPassword, resetPassword };
