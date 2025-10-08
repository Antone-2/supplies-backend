const express = require('express');
const { getCategoryTree, getCategoriesWithCounts, getCategoryById, createCategory, updateCategory, deleteCategory } = require('./category.controller');
const { authenticateToken, requireAdmin } = require('../../middleware/authMiddleware');
const router = express.Router();

// Public routes
router.get('/tree', getCategoryTree);
router.get('/counts', getCategoriesWithCounts);
router.get('/:id', getCategoryById);

// Admin routes
router.post('/', authenticateToken, requireAdmin, createCategory);
router.put('/:id', authenticateToken, requireAdmin, updateCategory);
router.delete('/:id', authenticateToken, requireAdmin, deleteCategory);

module.exports = router;
