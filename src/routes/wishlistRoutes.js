const express = require('express');
const wishlistController = require('../modules/wishlist/wishlist.controller');
const jwtAuthMiddleware = require('../middleware/jwtAuthMiddleware');
const router = express.Router();

// User-based wishlist endpoints
router.get('/', jwtAuthMiddleware, wishlistController.getUserWishlist);
router.post('/add', jwtAuthMiddleware, wishlistController.addToWishlist);
router.post('/remove', jwtAuthMiddleware, wishlistController.removeFromWishlist);

module.exports = router;
