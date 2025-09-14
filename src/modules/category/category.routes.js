const express = require('express');
const router = express.Router();
const categoryController = require('./category.controller');
const { authenticateToken, requireAdmin } = require('../../middleware/authMiddleware');

// Public routes
router.get('/tree', categoryController.getCategoryTree);
router.get('/counts', categoryController.getCategoriesWithCounts);
router.get('/:id', categoryController.getCategoryById);

// Admin routes
router.post('/', authenticateToken, requireAdmin, categoryController.createCategory);
router.put('/:id', authenticateToken, requireAdmin, categoryController.updateCategory);
router.delete('/:id', authenticateToken, requireAdmin, categoryController.deleteCategory);

module.exports = router;
