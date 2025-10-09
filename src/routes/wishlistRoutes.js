import express from 'express';
import wishlistController from '../modules/wishlist/wishlist.controller.js';
import jwtAuthMiddleware from '../middleware/jwtAuthMiddleware.js';
const router = express.Router();

// User-based wishlist endpoints
router.get('/', jwtAuthMiddleware, wishlistController.getUserWishlist);
router.post('/add', jwtAuthMiddleware, wishlistController.addToWishlist);
router.post('/remove', jwtAuthMiddleware, wishlistController.removeFromWishlist);

export default router;
