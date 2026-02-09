import express from 'express';
import { getCategoryTree, getCategoriesWithCounts, getCategoryById, createCategory, updateCategory, deleteCategory } from './category.controller.js';
import { authenticateToken, requireAdmin } from '../../middleware/authMiddleware.js';
const router = express.Router();


router.get('/tree', getCategoryTree);
router.get('/counts', getCategoriesWithCounts);
router.get('/', getCategoriesWithCounts);
router.get('/:id', getCategoryById);


router.post('/', authenticateToken, requireAdmin, createCategory);
router.put('/:id', authenticateToken, requireAdmin, updateCategory);
router.delete('/:id', authenticateToken, requireAdmin, deleteCategory);

export default router;
