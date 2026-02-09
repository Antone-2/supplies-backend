import crypto from 'crypto';
import bcrypt from 'bcrypt';
import User from '../../Database/models/user.model.js';
import * as emailService from '../../services/emailService.js';


export async function forgotPassword(req, res) {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }


        const resetToken = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000;
        await user.save();


        const resetPath = (user.role === 'admin' || user.role === 'super_admin') ? '/admin/reset-password' : '/reset-password';
        const resetUrl = `${process.env.FRONTEND_URL}${resetPath}?token=${resetToken}`;
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
        console.error('Forgot password error:', err);
        res.status(500).json({ message: 'Failed to send password reset email' });
    }
}


export async function resetPassword(req, res) {
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


        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ message: 'Password reset successful! You can now log in with your new password.' });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ message: 'Failed to reset password' });
    }
}