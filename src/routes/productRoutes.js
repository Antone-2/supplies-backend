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


router.get('/', getProducts);
router.get('/featured', getFeaturedProducts);
router.get('/featured/all', getFeaturedProducts);
router.get('/categories', getCategories);
router.get('/category/:category', getProductsByCategory);
router.post('/', createProduct);
router.get('/:id', getProductById);


router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);


router.get('/:productId/reviews', getProductReviews);


import reviewRoutes from './reviewRoutes.js';
router.use('/reviews', reviewRoutes);

export default router;