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

// Create a review (authenticated users only)
router.post('/', auth, createReview);

// Get reviews for a specific product (public)
router.get('/product/:productId', getProductReviews);

// Get user's own reviews (authenticated users only)
router.get('/user', auth, getUserReviews);

// Update a review (authenticated users only, own reviews)
router.put('/:reviewId', auth, updateReview);

// Delete a review (authenticated users only, own reviews)
router.delete('/:reviewId', auth, deleteReview);

export default router;