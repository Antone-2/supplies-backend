import express from 'express';
import jwtAuthMiddleware from '../middleware/jwtAuthMiddleware.js';
import admin from '../middleware/admin.js';
import {
    getUsers,
    createUser,
    updateUser,
    deleteUser
} from '../controllers/userController.js';
import {
    getAllOrders,
    updateOrder,
    getOrderAnalytics
} from '../modules/order/order.controller.js';

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
router.get('/orders', getAllOrders);
router.put('/orders/:id', updateOrder);

// Analytics
router.get('/analytics', getOrderAnalytics);

export default router;
