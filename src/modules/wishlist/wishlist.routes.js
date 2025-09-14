// wishlist.routes.js
const express = require('express');
const router = express.Router();
const wishlistController = require('./wishlist.controller');

// Get all wishlists
router.get('/', wishlistController.getWishlists);

// Get a single wishlist by ID
router.get('/:id', wishlistController.getWishlistById);

// Create a new wishlist
router.post('/', wishlistController.createWishlist);

// Update a wishlist
router.put('/:id', wishlistController.updateWishlist);

// Delete a wishlist
router.delete('/:id', wishlistController.deleteWishlist);

module.exports = router;