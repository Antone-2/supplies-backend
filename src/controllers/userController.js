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
// Admin: Get paginated list of users with enhanced management features
export async function getUsers(req, res) {
    try {
        const { page = 1, limit = 20, role, sortBy = 'createdAt', sortOrder = 'desc', search, status } = req.query;
        const query = {};
        if (role) query.role = role;

        // Add status filter (active/inactive)
        if (status === 'active') query.active = true;
        else if (status === 'inactive') query.active = false;

        // Add search functionality for name and email
        if (search && search.trim()) {
            const searchRegex = new RegExp(search.trim(), 'i');
            query.$or = [
                { name: searchRegex },
                { email: searchRegex }
            ];
        }

        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const users = await User.find(query)
            .select('-password -twoFactorOTP -twoFactorOTPExpires -verificationToken -resetPasswordToken -resetPasswordExpires')
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit));
        const total = await User.countDocuments(query);

        // Enhance user data with management information
        const enhancedUsers = users.map(user => {
            const userObj = user.toObject();

            // Add management flags
            userObj.canEdit = user.role !== 'super_admin' || req.user?.role === 'super_admin';
            userObj.canDelete = user.role !== 'super_admin' && !user.active;
            userObj.isInactive = !user.active;
            userObj.lastActive = user.lastLogin || user.updatedAt;

            // Add action permissions
            userObj.actions = {
                edit: userObj.canEdit,
                delete: userObj.canDelete,
                activate: !user.active,
                deactivate: user.active && user.role !== 'super_admin',
                resetPassword: user.role !== 'super_admin'
            };

            return userObj;
        });

        // Get summary statistics
        const totalActive = await User.countDocuments({ ...query, active: true });
        const totalInactive = await User.countDocuments({ ...query, active: false });
        const totalAdmins = await User.countDocuments({ ...query, role: 'admin' });
        const totalSuperAdmins = await User.countDocuments({ ...query, role: 'super_admin' });

        res.json({
            users: enhancedUsers,
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / parseInt(limit)),
            summary: {
                totalActive,
                totalInactive,
                totalAdmins,
                totalSuperAdmins,
                filters: {
                    role: role || 'all',
                    status: status || 'all',
                    search: search || null
                }
            }
        });
    } catch (err) {
        console.error('Error fetching users:', err);
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

// Admin: Update user with enhanced validation and logging
export async function updateUser(req, res) {
    try {
        const { id } = req.params;
        const { name, email, role, phone, active, password, resetPassword } = req.body;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Store original values for change tracking
        const originalValues = {
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone,
            active: user.active
        };

        // Validate role changes
        if (role && role !== user.role) {
            const validRoles = ['user', 'admin', 'super_admin'];
            if (!validRoles.includes(role)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid role. Must be one of: ${validRoles.join(', ')}`
                });
            }

            // Prevent changing super admin role unless current user is super admin
            if (user.role === 'super_admin' && req.user?.role !== 'super_admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Cannot modify super admin role',
                    reason: 'Only super admins can modify other super admin accounts'
                });
            }
        }

        // Check if email is being changed and if it's already taken
        if (email && email !== user.email) {
            const existingUser = await User.findOne({ email: email.toLowerCase() });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already in use by another account'
                });
            }
            user.email = email.toLowerCase();
        }

        // Update fields
        if (name) user.name = name.trim();
        if (role) user.role = role;
        if (phone !== undefined) user.phone = phone;
        if (active !== undefined) user.active = active;

        // Handle password reset
        if (resetPassword) {
            const tempPassword = Math.random().toString(36).slice(-8);
            user.password = await bcrypt.hash(tempPassword, 10);
            console.log(`🔑 Password reset for user ${user.name}: ${tempPassword}`);
        } else if (password) {
            user.password = await bcrypt.hash(password, 10);
        }

        await user.save();

        // Track changes made
        const changes = [];
        if (originalValues.name !== user.name) changes.push(`name: "${originalValues.name}" → "${user.name}"`);
        if (originalValues.email !== user.email) changes.push(`email: "${originalValues.email}" → "${user.email}"`);
        if (originalValues.role !== user.role) changes.push(`role: "${originalValues.role}" → "${user.role}"`);
        if (originalValues.phone !== user.phone) changes.push(`phone: "${originalValues.phone}" → "${user.phone}"`);
        if (originalValues.active !== user.active) changes.push(`active: ${originalValues.active} → ${user.active}`);
        if (resetPassword) changes.push('password reset');
        else if (password) changes.push('password changed');

        console.log(`✅ User ${user.name} updated:`, changes.length > 0 ? changes.join(', ') : 'no changes');

        // Return user without password
        const userResponse = user.toObject();
        delete userResponse.password;
        delete userResponse.twoFactorOTP;
        delete userResponse.twoFactorOTPExpires;

        // Add change summary
        userResponse.changes = changes;
        userResponse.lastModified = new Date();

        res.json({
            success: true,
            message: `User ${user.name} updated successfully`,
            user: userResponse,
            changes: changes.length > 0 ? changes : null,
            tempPassword: resetPassword ? tempPassword : undefined
        });
    } catch (err) {
        console.error('Error updating user:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to update user',
            error: err.message
        });
    }
}

// Admin: Delete user with enhanced validation
export async function deleteUser(req, res) {
    try {
        const { id } = req.params;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Prevent deleting super admin
        if (user.role === 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Cannot delete super admin users',
                reason: 'Super admin accounts are protected for system security'
            });
        }

        // Check if user has active orders (paid but not delivered)
        const activeOrders = await Order.countDocuments({
            user: id,
            paymentStatus: 'paid',
            orderStatus: { $nin: ['delivered', 'cancelled'] }
        });

        if (activeOrders > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete user with ${activeOrders} active order(s)`,
                details: 'User has pending orders that need to be completed or cancelled first',
                activeOrdersCount: activeOrders
            });
        }

        // Log the deletion for audit trail
        console.log(`🗑️ Admin deleting user: ${user.name} (${user.email}) - ID: ${id}`);

        // Store user info before deletion for response
        const deletedUserInfo = {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            active: user.active
        };

        await User.findByIdAndDelete(id);

        console.log(`✅ User ${user.name} successfully deleted`);

        res.json({
            success: true,
            message: `User ${user.name} has been successfully deleted`,
            deletedUser: deletedUserInfo
        });
    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to delete user',
            error: err.message
        });
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
