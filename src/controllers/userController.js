import crypto from 'crypto';
import nodemailer from 'nodemailer';
import Order from '../../Database/models/order.model.js';
import User from '../../Database/models/user.model.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';
import { validateProfile } from './user.validation.js';

// Admin: Bulk delete users
export async function bulkDeleteUsers(req, res) {
    try {
        const { userIds } = req.body;

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ message: 'User IDs array is required' });
        }

        // Prevent deleting super admins
        const users = await User.find({ _id: { $in: userIds } });
        const superAdmins = users.filter(user => user.role === 'super_admin');

        if (superAdmins.length > 0) {
            return res.status(403).json({
                message: 'Cannot delete super admin users',
                superAdmins: superAdmins.map(user => ({ id: user._id, name: user.name, email: user.email }))
            });
        }

        const result = await User.deleteMany({ _id: { $in: userIds } });

        res.json({
            message: `Successfully deleted ${result.deletedCount} users`,
            deletedCount: result.deletedCount
        });
    } catch (err) {
        console.error('Bulk delete error:', err);
        res.status(500).json({ message: 'Failed to delete users' });
    }
}

// Admin: Bulk update users
export async function bulkUpdateUsers(req, res) {
    try {
        const { userIds, updates } = req.body;

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ message: 'User IDs array is required' });
        }

        if (!updates || typeof updates !== 'object') {
            return res.status(400).json({ message: 'Updates object is required' });
        }

        // Validate allowed update fields
        const allowedFields = ['role', 'active'];
        const invalidFields = Object.keys(updates).filter(field => !allowedFields.includes(field));

        if (invalidFields.length > 0) {
            return res.status(400).json({
                message: 'Invalid update fields',
                invalidFields
            });
        }

        // Prevent changing super admin roles
        if (updates.role) {
            const users = await User.find({ _id: { $in: userIds } });
            const superAdmins = users.filter(user => user.role === 'super_admin');

            if (superAdmins.length > 0) {
                return res.status(403).json({
                    message: 'Cannot modify super admin users',
                    superAdmins: superAdmins.map(user => ({ id: user._id, name: user.name, email: user.email }))
                });
            }
        }

        const result = await User.updateMany(
            { _id: { $in: userIds } },
            { $set: updates },
            { runValidators: true }
        );

        res.json({
            message: `Successfully updated ${result.modifiedCount} users`,
            modifiedCount: result.modifiedCount
        });
    } catch (err) {
        console.error('Bulk update error:', err);
        res.status(500).json({ message: 'Failed to update users' });
    }
}
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
            .select('-password -twoFactorOTP -twoFactorOTPExpires -verificationToken -resetPasswordToken -resetPasswordExpires')
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

// Admin: Create new user
export async function createUser(req, res) {
    try {
        const { name, email, password, role = 'user', phone, active = true } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = new User({
            name,
            email,
            password: hashedPassword,
            role,
            phone,
            active
        });

        await user.save();

        // Return user without password
        const userResponse = user.toObject();
        delete userResponse.password;

        res.status(201).json({ user: userResponse });
    } catch (err) {
        console.error('Error creating user:', err);
        res.status(500).json({ message: 'Failed to create user' });
    }
}

// Admin: Update user
export async function updateUser(req, res) {
    try {
        const { id } = req.params;
        const { name, email, role, phone, active, password } = req.body;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if email is being changed and if it's already taken
        if (email && email !== user.email) {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ message: 'Email already in use' });
            }
            user.email = email;
        }

        if (name) user.name = name;
        if (role) user.role = role;
        if (phone !== undefined) user.phone = phone;
        if (active !== undefined) user.active = active;
        if (password) {
            user.password = await bcrypt.hash(password, 10);
        }

        await user.save();

        // Return user without password
        const userResponse = user.toObject();
        delete userResponse.password;

        res.json({ user: userResponse });
    } catch (err) {
        console.error('Error updating user:', err);
        res.status(500).json({ message: 'Failed to update user' });
    }
}

// Admin: Delete user
export async function deleteUser(req, res) {
    try {
        const { id } = req.params;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Prevent deleting super admin
        if (user.role === 'super_admin') {
            return res.status(403).json({ message: 'Cannot delete super admin' });
        }

        await User.findByIdAndDelete(id);

        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).json({ message: 'Failed to delete user' });
    }
}
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
            const notificationController = await import('../modules/notification/notification.controller.js');
            const { sendEmail } = notificationController;
            const title = 'Profile Updated';
            const message = 'Your account profile has been updated.';
            // Send email notification
            await sendEmail(user.email, title, `<p>${message}</p>`);
            // Create in-app notification
            if (typeof notificationController.createNotification === 'function') {
                await notificationController.createNotification({
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
        const orders = await Order.find(query)
            .populate('items.product', 'name imageUrl')
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Order.countDocuments(query);

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
