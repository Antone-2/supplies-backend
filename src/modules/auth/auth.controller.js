import User from '../../../Database/models/user.model.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import * as emailService from '../../services/emailService.js';

const register = async function register(req, res) {
    console.log('Register endpoint hit', req.body);
    // Debug: Log registration input
    console.log('Registration input:', { email: req.body.email, name: req.body.name });
    try {
        const { email, password, name } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        // Generate a mock verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const user = new User({ email, password: hashedPassword, name, isVerified: false, verificationToken });
        await user.save();
        // Debug: Log saved user
        console.log('User saved:', user);
        // In a real app, send verification email here
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

        // Generate token for auto-login after registration
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '6h' });

        // Set HTTP-only cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 6 * 60 * 60 * 1000, // 6 hours
            sameSite: 'strict'
        });

        res.status(201).json({
            message: 'Registration successful! You are now logged in. Please check your email to verify your account.',
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
        if (err.code === 11000 && err.keyPattern && err.keyPattern.email) {
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

        // Set HTTP-only cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 6 * 60 * 60 * 1000, // 6 hours
            sameSite: 'strict'
        });

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
        res.status(500).json({ message: 'Login failed' });
    }
};

const logout = async function logout(req, res) {
    // Clear the token cookie
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    });
    res.json({ message: 'Logged out successfully' });
};

const me = async function me(req, res) {
    try {
        // Get token from cookie
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ message: 'Unauthorized' });
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
    // Implement refresh token logic as needed
    res.json({ message: 'Refresh token endpoint' });
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
