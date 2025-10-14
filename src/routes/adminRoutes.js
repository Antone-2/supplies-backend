import express from 'express';
import jwtAuthMiddleware from '../middleware/jwtAuthMiddleware.js';
import admin from '../middleware/admin.js';
import {
    getUsers,
    createUser,
    updateUser,
    deleteUser
} from '../controllers/userController.js';
import orderController from '../modules/order/order.controller.js';
import productController from '../modules/product/product.controller.js';
import categoryController from '../modules/category/category.controller.js';

const router = express.Router();

// Apply admin middleware to all routes
router.use(jwtAuthMiddleware);
router.use(admin);

// User management
router.get('/users', getUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// Order management
router.get('/orders', orderController.getAllOrders);
router.put('/orders/:id', orderController.updateOrder);

// Analytics
router.get('/analytics', orderController.getOrderAnalytics);

// Dashboard stats
router.get('/dashboard/stats', orderController.getDashboardStats);

// Product management
router.get('/products', productController.getProducts);
router.post('/products', productController.createProduct);
router.put('/products/:id', productController.updateProduct);
router.delete('/products/:id', productController.deleteProduct);

// Category management
router.get('/categories', categoryController.getCategoriesWithCounts);
router.post('/categories', categoryController.createCategory);
router.put('/categories/:id', categoryController.updateCategory);
router.delete('/categories/:id', categoryController.deleteCategory);

export default router;
