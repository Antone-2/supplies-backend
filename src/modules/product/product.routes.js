import express from 'express';
import { getCategoriesWithCounts, getCategories, getProductsByCategory, getProducts, getFeaturedProducts, getProductById, createProduct, updateProduct, deleteProduct, getAllProducts } from './product.controller.js';
import auth from '../../middleware/auth.js';
import { default as admin } from '../../middleware/admin.js';
const router = express.Router();

// Get all categories with product counts
router.get('/categories/counts', getCategoriesWithCounts);
// Get all unique categories
router.get('/categories', getCategories);

// Get products by category
router.get('/category/:category', getProductsByCategory);

// Get all products
router.get('/', getProducts);

// Get all featured products
router.get('/featured', getFeaturedProducts);

// Get a single product by ID
router.get('/:id', getProductById);

// Create a new product (admin only)
router.post('/', auth, admin, createProduct);

// Update a product (admin only)
router.put('/:id', auth, admin, updateProduct);

// Delete a product (admin only)
router.delete('/:id', auth, admin, deleteProduct);

export default router;
