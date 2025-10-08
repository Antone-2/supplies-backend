const express = require('express');
const router = express.Router();
const generalReviewController = require('../controllers/generalReviewController');
const jwtAuthMiddleware = require('../middleware/jwtAuthMiddleware');

// Optional JWT middleware - allows both authenticated and unauthenticated users
const optionalJwtAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const jwt = require('jsonwebtoken');
            const config = require('../../config/index');
            const User = require('../../Database/models/user.model');

            const decoded = jwt.verify(token, config.jwtSecret);
            const user = await User.findById(decoded.id);
            if (user) {
                req.user = user;
            }
        } catch (err) {
            // Ignore invalid tokens for optional auth
            console.log('Invalid token in optional auth:', err.message);
        }
    }
    next();
};

// Public routes
router.get('/', generalReviewController.getGeneralReviews);

// Allow both authenticated and unauthenticated users to create reviews
router.post('/', optionalJwtAuth, generalReviewController.createGeneralReview);

// Protected routes (require authentication)
router.get('/my-review', jwtAuthMiddleware, generalReviewController.getUserGeneralReview);
router.put('/my-review', jwtAuthMiddleware, generalReviewController.updateGeneralReview);
router.delete('/my-review', jwtAuthMiddleware, generalReviewController.deleteGeneralReview);

module.exports = router;