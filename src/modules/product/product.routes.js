import express from 'express';
import { getCategoriesWithCounts, getCategories, getProductsByCategory, getProducts, getFeaturedProducts, getProductById, createProduct, updateProduct, deleteProduct, getAllProducts } from './product.controller.js';
import auth from '../../middleware/auth.js';
import { default as admin } from '../../middleware/admin.js';
const router = express.Router();


router.get('/categories/counts', getCategoriesWithCounts);

router.get('/categories', getCategories);


router.get('/category/:category', getProductsByCategory);


router.get('/', getProducts);


router.get('/featured', getFeaturedProducts);


router.get('/:id', getProductById);


router.post('/', auth, admin, createProduct);


router.put('/:id', auth, admin, updateProduct);


router.delete('/:id', auth, admin, deleteProduct);

export default router;
