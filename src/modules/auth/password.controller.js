import crypto from 'crypto';
import User from '../../Database/models/user.model.js';
import { sendEmail } from '../../services/emailService.js';

// POST /api/v1/auth/forgot-password
export async function forgotPassword(req, res) {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600 * 1000; // 1 hour
    await user.save();

    // Send email with reset link (points to frontend)
    const resetUrl = `https://medhelmsupplies.co.ke/reset-password/${token}`;
    await sendEmail(email, 'Reset your password', `Click <a href='${resetUrl}'>here</a> to reset your password.`);
    res.json({ message: 'Reset link sent to email' });
}

// POST /api/v1/auth/reset-password/:token
export async function resetPassword(req, res) {
    const { token } = req.params;
    const { password } = req.body;
    const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() }
    });
    if (!user) return res.status(400).json({ message: 'Invalid or expired token' });

    // You should hash the password before saving!
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    res.json({ message: 'Password reset successful' });
}