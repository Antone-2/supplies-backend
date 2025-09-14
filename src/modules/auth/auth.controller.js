const User = require('../../../Database/models/user.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

exports.register = async (req, res) => {
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
        const { sendEmail } = require('../../utils/emailService');
        const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
        const logoUrl = 'https://medhelmsupplies.co.ke/medhelm-logo.png'; // Use your actual logo URL
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; border: 1px solid #eee; border-radius: 8px; padding: 24px;">
                <div style="text-align: center; margin-bottom: 16px;">
                    <img src="${logoUrl}" alt="Medhelm Supplies Logo" style="height: 60px; margin-bottom: 8px;" />
                    <h2 style="color: #2563eb; margin: 0;">Medhelm Supplies</h2>
                </div>
                <p>Hello ${name},</p>
                <p>Thank you for registering. Please verify your email by clicking the link below:</p>
                <div style="text-align: center; margin: 24px 0;">
                    <a href="${verificationUrl}" style="background: #2563eb; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Verify Email</a>
                </div>
                <p>If you did not register, please ignore this email.</p>
                <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
                <p style="font-size: 12px; color: #888; text-align: center;">&copy; ${new Date().getFullYear()} Medhelm Supplies</p>
            </div>
        `;
        try {
            await sendEmail(email, 'Verify your email', html);
            console.log('Verification email sent to:', email);
        } catch (emailErr) {
            console.error('Error sending verification email:', emailErr);
        }
        res.status(201).json({ message: 'Registration successful! A verification link has been sent to your email. Please check your inbox and click the link to complete your registration.' });
    } catch (err) {
        console.log('Registration error:', err);
        res.status(400).json({ message: 'Registration failed' });
    }
};

// Email verification endpoint (moved out of register)
exports.verifyEmail = async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) {
            return res.status(400).json({ message: 'Invalid or missing token' });
        }
        const user = await User.findOne({ verificationToken: token });
        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }
        user.isVerified = true;
        user.verificationToken = undefined;
        await user.save();
        res.json({ message: 'Account verified' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to verify account' });
    }
};
// Email verification endpoint

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Login attempt:', { email });
        const user = await User.findOne({ email });
        if (!user) {
            console.log('Login failed: user not found');
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const passwordMatch = await bcrypt.compare(password, user.password);
        console.log('Password match:', passwordMatch);
        if (!passwordMatch) {
            console.log('Login failed: password mismatch');
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
        // Exclude password from user object
        const { password: _pw, ...userWithoutPassword } = user.toObject();
        res.json({ user: userWithoutPassword, token });
    } catch (err) {
        console.log('Login error:', err);
        res.status(500).json({ message: 'Login failed' });
    }
};

exports.logout = async (req, res) => {
    // For stateless JWT, logout is handled client-side
    res.json({ message: 'Logged out successfully' });
};

exports.me = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: 'Failed to get user' });
    }
};

exports.refreshToken = async (req, res) => {
    // Implement refresh token logic as needed
    res.json({ message: 'Refresh token endpoint' });
};

exports.forgotPassword = async (req, res) => {
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

        // Send password reset email
        const { sendEmail } = require('../../utils/emailService');
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
        const logoUrl = 'https://medhelmsupplies.co.ke/medhelm-logo.png'; // Use your actual logo URL
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; border: 1px solid #eee; border-radius: 8px; padding: 24px;">
                <div style="text-align: center; margin-bottom: 16px;">
                    <img src="${logoUrl}" alt="Medhelm Supplies Logo" style="height: 60px; margin-bottom: 8px;" />
                    <h2 style="color: #2563eb; margin: 0;">Medhelm Supplies</h2>
                </div>
                <p>Hello,</p>
                <p>You requested a password reset for your Medhelm Supplies account. Click the button below to reset your password:</p>
                <div style="text-align: center; margin: 24px 0;">
                    <a href="${resetUrl}" style="background: #2563eb; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Reset Password</a>
                </div>
                <p>This link will expire in 1 hour for security reasons.</p>
                <p>If you did not request a password reset, please ignore this email.</p>
                <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
                <p style="font-size: 12px; color: #888; text-align: center;">&copy; ${new Date().getFullYear()} Medhelm Supplies</p>
            </div>
        `;

        try {
            await sendEmail(email, 'Reset Your Password - Medhelm Supplies', html);
            console.log('Password reset email sent to:', email);
        } catch (e) {
            console.error('Error sending password reset email:', e);
            return res.status(500).json({ message: 'Failed to send reset email' });
        }
        res.json({ message: 'Password reset email sent' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to send reset email' });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;

        // Validate password strength
        if (!password || password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }

        // Check for strong password requirements (at least one uppercase, lowercase, number, and special character)
        const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;
        if (!strongPasswordRegex.test(password)) {
            return res.status(400).json({
                message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character'
            });
        }

        // Find user with valid reset token
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            // Check if token exists but is expired
            const expiredUser = await User.findOne({ resetPasswordToken: token });
            if (expiredUser && expiredUser.resetPasswordExpires <= Date.now()) {
                return res.status(400).json({ message: 'Reset token has expired. Please request a new password reset.' });
            }
            return res.status(400).json({ message: 'Invalid reset token' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update user with new password and clear reset token fields
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ message: 'Password reset successful' });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ message: 'Failed to reset password' });
    }
};

// Helper endpoints for Cypress testing
exports.getVerificationToken = async (req, res) => {
    try {
        console.log('getVerificationToken called with:', req.body);
        const { email } = req.body;
        const user = await User.findOne({ email });
        console.log('User found:', user ? 'yes' : 'no');
        if (!user) {
            console.log('User not found for email:', email);
            return res.status(404).json({ message: 'User not found' });
        }
        console.log('Verification token:', user.verificationToken);
        res.json({ token: user.verificationToken });
    } catch (err) {
        console.error('Error in getVerificationToken:', err);
        res.status(500).json({ message: 'Failed to get verification token' });
    }
};

exports.getResetToken = async (req, res) => {
    try {
        console.log('getResetToken called with:', req.body);
        const { email } = req.body;
        const user = await User.findOne({ email });
        console.log('User found:', user ? 'yes' : 'no');
        if (!user) {
            console.log('User not found for email:', email);
            return res.status(404).json({ message: 'User not found' });
        }
        console.log('Reset token:', user.resetPasswordToken);
        res.json({ token: user.resetPasswordToken });
    } catch (err) {
        console.error('Error in getResetToken:', err);
        res.status(500).json({ message: 'Failed to get reset token' });
    }
};
