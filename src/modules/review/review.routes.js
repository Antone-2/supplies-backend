// review.routes.js
const express = require('express');
const router = express.Router();
const reviewController = require('./review.controller');

// Get all reviews
router.get('/', reviewController.getReviews);

// Get a single review by ID
router.get('/:id', reviewController.getReviewById);

// Create a new review
router.post('/', reviewController.createReview);

// Update a review
router.put('/:id', reviewController.updateReview);

// Delete a review
router.delete('/:id', reviewController.deleteReview);

module.exports = router;