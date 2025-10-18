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

// User management
router.get('/users', getUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.delete('/users/bulk', bulkDeleteUsers);
router.put('/users/bulk', bulkUpdateUsers);

// Order management
router.get('/orders', orderController.getAllOrders);
router.put('/orders/:id', orderController.updateOrder);
router.post('/orders/:id/notes', orderController.addOrderNote);
router.delete('/orders/bulk', orderController.bulkDeleteOrders);
router.put('/orders/bulk', orderController.bulkUpdateOrders);

// Individual order actions
router.put('/orders/:id/status', orderController.updateOrderStatus);

// Analytics
router.get('/analytics', orderController.getOrderAnalytics);

// Dashboard stats
router.get('/dashboard/stats', orderController.getDashboardStats);

// Product management
router.get('/products', getAllProducts);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

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
