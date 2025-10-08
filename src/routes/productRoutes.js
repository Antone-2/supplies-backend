const express = require('express');
const router = express.Router();
const {
    getProducts,
    getProductById,
    getCategories,
    getFeaturedProducts,
    getProductsByCategory,
    createProduct,
    updateProduct,
    deleteProduct,
} = require('../modules/product/product.controller');
const reviewController = require('../controllers/reviewController');

// Product routes
router.get('/', getProducts);
router.get('/featured', getFeaturedProducts);
router.get('/categories', getCategories);
router.get('/category/:category', getProductsByCategory);
router.post('/', createProduct); // Add create product route
router.get('/:id', getProductById);

// Admin product management routes
router.put('/:id', updateProduct); // Update product
router.delete('/:id', deleteProduct); // Delete product

// Product review routes
router.get('/:productId/reviews', reviewController.getProductReviews);

module.exports = router;