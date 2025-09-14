// productRoutes.js
const express = require('express');
const router = express.Router();
const productController = require('../modules/product/product.controller');

router.get('/', productController.getProducts);
router.get('/:id', productController.getProductById);
router.post('/', productController.createProduct);
router.put('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

module.exports = router;