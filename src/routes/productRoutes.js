import express from 'express';
const router = express.Router();
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
import { getProductReviews } from '../controllers/reviewController.js';

// Product routes
router.get('/', getProducts);
router.get('/featured', getFeaturedProducts);
router.get('/featured/all', getFeaturedProducts);
router.get('/categories', getCategories);
router.get('/category/:category', getProductsByCategory);
router.post('/', createProduct); // Add create product route
router.get('/:id', getProductById);

// Admin product management routes
router.put('/:id', updateProduct); // Update product
router.delete('/:id', deleteProduct); // Delete product

// Product review routes
router.get('/:productId/reviews', getProductReviews);

export default router;
