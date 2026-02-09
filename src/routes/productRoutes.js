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


router.get('/', getProducts);
router.get('/featured', getFeaturedProducts);
router.get('/featured/all', getFeaturedProducts);
router.get('/categories', getCategories);
router.get('/category/:category', getProductsByCategory);
router.post('/', createProduct);
router.get('/:id', getProductById);


router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);


export default router;
