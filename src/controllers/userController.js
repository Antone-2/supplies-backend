import crypto from 'crypto';
import nodemailer from 'nodemailer';
// POST /api/v1/users/2fa/request
export async function request2FA(req, res) {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });
    // Generate OTP
    const otp = (Math.floor(100000 + Math.random() * 900000)).toString();
    user.twoFactorOTP = otp;
    user.twoFactorOTPExpires = Date.now() + 10 * 60 * 1000; // 10 min expiry
    await user.save();
    // Send OTP via email
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
    await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: user.email,
        subject: 'Your Medhelm 2FA Code',
        html: `<p>Your verification code is <b>${otp}</b>. It expires in 10 minutes.</p>`
    });
    res.json({ message: 'OTP sent to email' });
}

// POST /api/v1/users/2fa/verify
export async function verify2FA(req, res) {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!user.twoFactorOTP || !user.twoFactorOTPExpires) {
        return res.status(400).json({ message: 'No OTP requested' });
    }
    if (Date.now() > user.twoFactorOTPExpires) {
        return res.status(400).json({ message: 'OTP expired' });
    }
    if (user.twoFactorOTP !== otp) {
        return res.status(400).json({ message: 'Invalid OTP' });
    }
    user.twoFactorOTP = undefined;
    user.twoFactorOTPExpires = undefined;
    user.twoFactorEnabled = true;
    await user.save();
    res.json({ message: '2FA verified' });
}
// Admin: Get paginated list of users
export async function getUsers(req, res) {
    try {
        const { page = 1, limit = 20, role, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        const query = {};
        if (role) query.role = role;

        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const users = await User.find(query)
            .select('-password')
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit));
        const total = await User.countDocuments(query);

        res.json({
            users,
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / parseInt(limit))
        });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch users' });
    }
}
import User from '../../Database/models/user.model.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';
import { validateProfile } from './user.validation.js';
// POST /api/v1/users/avatar
export async function uploadAvatar(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        const userId = req.user.id;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        // Save avatar URL (local path)
        const avatarUrl = `/uploads/${req.file.filename}`;
        user.avatar = avatarUrl;
        await user.save();
        res.json({ url: avatarUrl });
    } catch (err) {
        res.status(500).json({ message: 'Failed to upload avatar' });
    }
}

export async function getProfile(req, res) {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching profile' });
    }
}

export async function updateProfile(req, res) {
    const { error } = validateProfile(req.body);
    if (error) {
        return res.status(400).json({ message: 'Validation error', details: error.details });
    }
    try {
        const userId = req.user.id;
        const { name, email, password, phone } = req.body;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (name) user.name = name;
        if (email) user.email = email;
        if (password) user.password = await bcrypt.hash(password, 10);
        if (phone) user.phone = phone;
        await user.save();
        // Send notification (email and in-app) for profile update
        try {
            const { sendEmail } = require('../modules/notification/notification.controller');
            const title = 'Profile Updated';
            const message = 'Your account profile has been updated.';
            // Send email notification
            await sendEmail(user.email, title, `<p>${message}</p>`);
            // Create in-app notification
            if (typeof require('../modules/notification/notification.controller').createNotification === 'function') {
                await require('../modules/notification/notification.controller').createNotification({
                    body: {
                        title,
                        message,
                        type: 'system',
                        userId: user._id,
                        via: 'email',
                    },
                    user: user,
                }, { status: () => ({ json: () => { } }) }, () => { });
            }
        } catch (notifyErr) {
            console.error('Error sending profile update notification:', notifyErr);
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error updating profile' });
    }
}

export async function getAddresses(req, res) {
    res.json({ addresses: [] });
}

export async function addAddress(req, res) {
    res.json({ message: 'Address added' });
}

export async function updateAddress(req, res) {
    res.json({ message: 'Address updated' });
}

export async function deleteAddress(req, res) {
    res.json({ message: 'Address deleted' });
}

export async function getUserOrders(req, res) {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20, status, paymentStatus, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

        const query = { user: userId };
        if (status) query.orderStatus = status;
        if (paymentStatus) query.paymentStatus = paymentStatus;

        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const orders = await require('../../../Database/models/order.model').find(query)
            .populate('items.product', 'name imageUrl')
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit));

        const total = await require('../../../Database/models/order.model').countDocuments(query);

        res.json({
            orders,
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / parseInt(limit))
        });
    } catch (error) {
        console.error('Error fetching user orders:', error);
        res.status(500).json({ message: 'Failed to fetch orders' });
    }
}
