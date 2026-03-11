import express from 'express';
const router = express.Router();

/**
 * ================================================
 * INPUT VALIDATION IMPORTS
 * ================================================
 * Using express-validator for strict input validation
 */
import {
    validateRequest,
    productValidation,
    objectIdValidation,
    paginationValidation,
    searchValidation
} from '../middleware/enhancedSecurity.js';

import {
    getProducts,
    getProductById,
    getCategories,
    getFeaturedProducts,
    getProductsByCategory,
    createProduct,
    updateProduct,
    deleteProduct,
} from '../modules/product/product.controller.js';


/**
 * ================================================
 * PRODUCT ROUTES WITH VALIDATION
 * ================================================
 * Public endpoints (GET): Minimal validation for search/pagination
 * Admin endpoints (POST/PUT/DELETE): Full input validation
 */

/**
 * GET / - List all products
 * Query params: page, limit, sort, category, search
 * Public access
 */
router.get('/', paginationValidation, validateRequest, getProducts);

/**
 * GET /featured - Get featured products
 * Public access
 */
router.get('/featured', getFeaturedProducts);

/**
 * GET /featured/all - Get all featured products
 * Public access
 */
router.get('/featured/all', getFeaturedProducts);

/**
 * GET /categories - Get all categories
 * Public access
 */
router.get('/categories', getCategories);

/**
 * GET /category/:category - Get products by category
 * Validation: category name length
 * Public access
 */
router.get('/category/:category', getProductsByCategory);

/**
 * POST / - Create new product
 * Admin only - Full product validation
 */
router.post('/', productValidation, validateRequest, createProduct);

/**
 * GET /:id - Get product by ID
 * Validation: MongoDB ObjectId
 * Public access
 */
router.get('/:id', objectIdValidation('id'), validateRequest, getProductById);

/**
 * PUT /:id - Update product
 * Admin only - Full product validation + ObjectId
 */
router.put('/:id', objectIdValidation('id'), productValidation, validateRequest, updateProduct);

/**
 * DELETE /:id - Delete product
 * Admin only - ObjectId validation
 */
router.delete('/:id', objectIdValidation('id'), validateRequest, deleteProduct);


export default router;
