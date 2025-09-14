
// product.routes.js
const express = require('express');
const router = express.Router();
const productController = require('./product.controller');

// Get all categories with product counts
router.get('/categories/counts', productController.getCategoriesWithCounts);
// Get all unique categories
router.get('/categories', productController.getCategories);

// Get products by category
router.get('/category/:category', productController.getProductsByCategory);

// Get all products
router.get('/', productController.getProducts);

// Get all featured products
router.get('/featured/all', productController.getFeaturedProducts);

// Get a single product by ID
router.get('/:id', productController.getProductById);


const auth = require('../../middleware/auth');
const admin = require('../../middleware/admin');

// Create a new product (admin only)
router.post('/', auth, admin, productController.createProduct);

// Update a product (admin only)
router.put('/:id', auth, admin, productController.updateProduct);

// Delete a product (admin only)
router.delete('/:id', auth, admin, productController.deleteProduct);

module.exports = router;
