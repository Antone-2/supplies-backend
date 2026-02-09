import express from 'express';
const router = express.Router();
import {
    createReview,
    getProductReviews,
    getUserReviews,
    updateReview,
    deleteReview
} from '../controllers/reviewController.js';
import auth from '../middleware/auth.js';


router.post('/', auth, createReview);


router.get('/product/:productId', getProductReviews);


router.get('/user', auth, getUserReviews);


router.put('/:reviewId', auth, updateReview);


router.delete('/:reviewId', auth, deleteReview);

export default router;
