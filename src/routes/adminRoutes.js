import express from 'express';
import jwtAuthMiddleware from '../middleware/jwtAuthMiddleware.js';
import admin from '../middleware/admin.js';
import {
    getUsers,
    createUser,
    updateUser,
    deleteUser,
    bulkDeleteUsers,
    bulkUpdateUsers
} from '../controllers/userController.js';
import orderController from '../modules/order/order.controller.js';
import { getAllProducts, createProduct, updateProduct, deleteProduct } from '../modules/product/product.controller.js';
import { getCategoriesWithCounts, createCategory, updateCategory, deleteCategory } from '../modules/category/category.controller.js';
import { getSettings, updateSetting } from '../controllers/adminSettingController.js';
import notificationRoutes from './notificationRoutes.js';

const router = express.Router();

// Apply admin middleware to all routes
router.use(jwtAuthMiddleware);
router.use(admin);

// User management with enhanced actions
router.get('/users', getUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.delete('/users/bulk', bulkDeleteUsers);
router.put('/users/bulk', bulkUpdateUsers);

// Additional user management actions
router.post('/users/:id/activate', async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        user.active = true;
        await user.save();

        res.json({ success: true, message: `User ${user.name} activated successfully` });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to activate user' });
    }
});

router.post('/users/:id/deactivate', async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        if (user.role === 'super_admin') {
            return res.status(403).json({ success: false, message: 'Cannot deactivate super admin' });
        }

        user.active = false;
        await user.save();

        res.json({ success: true, message: `User ${user.name} deactivated successfully` });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to deactivate user' });
    }
});

router.post('/users/:id/reset-password', async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        if (user.role === 'super_admin') {
            return res.status(403).json({ success: false, message: 'Cannot reset super admin password' });
        }

        const tempPassword = Math.random().toString(36).slice(-8);
        user.password = await bcrypt.hash(tempPassword, 10);
        await user.save();

        res.json({
            success: true,
            message: `Password reset for ${user.name}`,
            tempPassword: tempPassword
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to reset password' });
    }
});

// Order management
router.get('/orders', orderController.getAllOrders);
router.put('/orders/:id', orderController.updateOrder);
router.delete('/orders/:id', orderController.deleteOrder);
router.post('/orders/:id/notes', orderController.addOrderNote);
router.delete('/orders/bulk', orderController.bulkDeleteOrders);
router.put('/orders/bulk', orderController.bulkUpdateOrders);

// Individual order actions
router.put('/orders/:id/status', orderController.updateOrderStatus);

// Order processing workflow endpoints
router.post('/orders/:id/process', orderController.processOrder);
router.post('/orders/:id/fulfill', orderController.fulfillOrder);
router.post('/orders/:id/ship', orderController.shipOrder);
router.post('/orders/:id/deliver', orderController.deliverOrder);
router.post('/orders/:id/cancel', orderController.cancelOrder);

// Additional order workflow actions for frontend action icons
router.post('/orders/:id/ready', async (req, res) => {
    try {
        const { id } = req.params;
        const order = await orderModel.findById(id);
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

        if (order.orderStatus !== 'fulfilled') {
            return res.status(400).json({
                success: false,
                message: `Order must be fulfilled to mark as ready for shipping. Current status: ${order.orderStatus}`
            });
        }

        order.orderStatus = 'ready';
        order.timeline.push({
            status: 'ready',
            changedAt: new Date(),
            note: 'Order marked as ready for shipping'
        });

        await order.save();

        res.json({
            success: true,
            message: `Order ${order.orderNumber} is ready for shipping`,
            order: { id: order._id, orderNumber: order.orderNumber, orderStatus: order.orderStatus }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to mark order as ready', error: error.message });
    }
});

router.post('/orders/:id/pickup', async (req, res) => {
    try {
        const { id } = req.params;
        const order = await orderModel.findById(id);
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

        if (!['ready', 'fulfilled'].includes(order.orderStatus)) {
            return res.status(400).json({
                success: false,
                message: `Order must be ready or fulfilled for pickup. Current status: ${order.orderStatus}`
            });
        }

        order.orderStatus = 'picked_up';
        order.timeline.push({
            status: 'picked_up',
            changedAt: new Date(),
            note: 'Order picked up for delivery'
        });

        await order.save();

        res.json({
            success: true,
            message: `Order ${order.orderNumber} has been picked up`,
            order: { id: order._id, orderNumber: order.orderNumber, orderStatus: order.orderStatus }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to mark order as picked up', error: error.message });
    }
});

// Test endpoint for admin actions
router.get('/test', (req, res) => {
    res.json({
        message: 'Admin API endpoints are working',
        timestamp: new Date().toISOString(),
        availableEndpoints: {
            orders: [
                'GET /api/v1/admin/orders - Get all orders (with payment filters)',
                'GET /api/v1/admin/orders?paymentFilter=paid - Get only paid orders',
                'GET /api/v1/admin/orders?paymentFilter=unpaid - Get only unpaid orders',
                'PUT /api/v1/admin/orders/:id - Update order',
                'PUT /api/v1/admin/orders/:id/status - Update order status',
                'POST /api/v1/admin/orders/:id/notes - Add order note',
                'DELETE /api/v1/admin/orders/:id - Delete order',
                'POST /api/v1/admin/orders/:id/process - Process PAID order',
                'POST /api/v1/admin/orders/:id/fulfill - Mark as fulfilled',
                'POST /api/v1/admin/orders/:id/ship - Mark as shipped',
                'POST /api/v1/admin/orders/:id/deliver - Mark as delivered',
                'POST /api/v1/admin/orders/:id/cancel - Cancel order',
                'DELETE /api/v1/admin/orders/bulk - Bulk delete orders',
                'PUT /api/v1/admin/orders/bulk - Bulk update orders'
            ],
            users: [
                'GET /api/v1/admin/users - Get all users (with status filters)',
                'GET /api/v1/admin/users?status=inactive - Get only inactive users',
                'POST /api/v1/admin/users - Create new user',
                'PUT /api/v1/admin/users/:id - Update user',
                'DELETE /api/v1/admin/users/:id - Delete user (inactive only)',
                'POST /api/v1/admin/users/:id/activate - Activate user',
                'POST /api/v1/admin/users/:id/deactivate - Deactivate user',
                'POST /api/v1/admin/users/:id/reset-password - Reset user password',
                'DELETE /api/v1/admin/users/bulk - Bulk delete users',
                'PUT /api/v1/admin/users/bulk - Bulk update users'
            ],
            products: [
                'GET /api/v1/admin/products - Get all products',
                'POST /api/v1/admin/products - Create product',
                'PUT /api/v1/admin/products/:id - Update product',
                'DELETE /api/v1/admin/products/:id - Delete product'
            ],
            categories: [
                'GET /api/v1/admin/categories - Get all categories',
                'POST /api/v1/admin/categories - Create category',
                'PUT /api/v1/admin/categories/:id - Update category',
                'DELETE /api/v1/admin/categories/:id - Delete category'
            ],
            analytics: [
                'GET /api/v1/admin/analytics - Get dashboard analytics',
                'GET /api/v1/admin/dashboard/stats - Get dashboard stats'
            ]
        },
        filters: {
            orders: {
                paymentFilter: {
                    all: 'Show all orders',
                    paid: 'Show only paid orders (ready for processing)',
                    unpaid: 'Show only unpaid orders',
                    pending: 'Show only pending payment orders'
                }
            },
            users: {
                status: {
                    all: 'Show all users',
                    active: 'Show only active users',
                    inactive: 'Show only inactive users (for deletion)'
                }
            }
        },
        workflows: {
            orders: [
                '1. Order created → pending',
                '2. Payment completed → paid',
                '3. Admin processes → processing',
                '4. Warehouse fulfills → fulfilled',
                '5. Mark as ready → ready',
                '6. Pickup for delivery → picked_up',
                '7. Shipping ships → shipped (with tracking)',
                '8. Customer receives → delivered'
            ],
            orderActions: {
                process: 'POST /api/v1/admin/orders/:id/process - Move from pending to processing',
                fulfill: 'POST /api/v1/admin/orders/:id/fulfill - Mark as fulfilled after processing',
                ready: 'POST /api/v1/admin/orders/:id/ready - Mark as ready for shipping',
                pickup: 'POST /api/v1/admin/orders/:id/pickup - Mark as picked up for delivery',
                ship: 'POST /api/v1/admin/orders/:id/ship - Ship with tracking number',
                deliver: 'POST /api/v1/admin/orders/:id/deliver - Mark as delivered',
                cancel: 'POST /api/v1/admin/orders/:id/cancel - Cancel order (if not shipped)',
                addNote: 'POST /api/v1/admin/orders/:id/notes - Add internal notes',
                update: 'PUT /api/v1/admin/orders/:id - Update order details',
                delete: 'DELETE /api/v1/admin/orders/:id - Delete unpaid orders only',
                status: 'PUT /api/v1/admin/orders/:id/status - Update order status directly'
            },
            users: [
                '1. User registers → active',
                '2. Admin can edit user details',
                '3. Admin can deactivate inactive users',
                '4. Admin can delete inactive users (no active orders)',
                '5. Admin can reset passwords',
                '6. Super admins have full protection'
            ]
        }
    });
});

// Analytics
router.get('/analytics', orderController.getOrderAnalytics);

// Dashboard stats
router.get('/dashboard/stats', orderController.getDashboardStats);

// Product management
router.get('/products', getAllProducts);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

// Test endpoint for debugging
router.get('/products/test', (req, res) => {
    res.json({
        message: 'Products endpoint is working',
        timestamp: new Date().toISOString(),
        route: '/api/v1/admin/products'
    });
});

// Category management
router.get('/categories', getCategoriesWithCounts);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

// Settings management
router.get('/settings', getSettings);
router.put('/settings/:key', updateSetting);

// Notification management
router.use('/notifications', notificationRoutes);

export default router;
