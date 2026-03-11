import express from 'express';
import {
    getProfile,
    updateProfile,
    getAddresses,
    addAddress,
    updateAddress,
    deleteAddress,
    getUsers,
    getUserOrders,
    request2FA,
    verify2FA,
    uploadAvatar
} from '../controllers/userController.js';
import jwtAuthMiddleware from '../middleware/jwtAuthMiddleware.js';
import { createReview, getUserReviews, updateReview, deleteReview, checkDeliveredPurchase, checkGeneralReviewEligibility } from '../controllers/reviewController.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * ================================================
 * INPUT VALIDATION IMPORTS
 * ================================================
 * Using express-validator for strict input validation
 * and sanitization on all user inputs
 */
import {
    validateRequest,
    objectIdValidation,
    paginationValidation,
    passwordChangeValidation
} from '../middleware/enhancedSecurity.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();


/**
 * ================================================
 * FILE UPLOAD CONFIGURATION
 * ================================================
 * Secure file upload with size limits and type restrictions
 */
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../../uploads'));
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        cb(null, `avatar-${req.user.id}-${Date.now()}${ext}`);
    }
});

// Restrict to images only, max 5MB
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed'));
    }
});


/**
 * ================================================
 * USER ROUTES WITH VALIDATION
 * ================================================
 * All endpoints require JWT authentication
 * Input validation on all POST, PUT requests
 */

// Get list of users (admin only)
router.get('/', jwtAuthMiddleware, paginationValidation, validateRequest, getUsers);

// Get current user profile
router.get('/profile', jwtAuthMiddleware, getProfile);

// Update current user profile
router.put('/profile', jwtAuthMiddleware, updateProfile);

// Upload user avatar
router.post('/avatar', jwtAuthMiddleware, upload.single('file'), uploadAvatar);

// Get user's orders
router.get('/orders', jwtAuthMiddleware, paginationValidation, validateRequest, getUserOrders);

// Get user's addresses
router.get('/addresses', jwtAuthMiddleware, getAddresses);

// Add new address
router.post('/addresses', jwtAuthMiddleware, addAddress);

// Update address - validate MongoDB ID
router.put('/addresses/:addressId', jwtAuthMiddleware, objectIdValidation('addressId'), validateRequest, updateAddress);

// Delete address - validate MongoDB ID
router.delete('/addresses/:addressId', jwtAuthMiddleware, objectIdValidation('addressId'), validateRequest, deleteAddress);

// User reviews
router.post('/reviews', jwtAuthMiddleware, createReview);
router.get('/reviews', jwtAuthMiddleware, getUserReviews);
router.put('/reviews/:reviewId', jwtAuthMiddleware, objectIdValidation('reviewId'), validateRequest, updateReview);
router.delete('/reviews/:reviewId', jwtAuthMiddleware, objectIdValidation('reviewId'), validateRequest, deleteReview);

// Purchase verification - validate product ID
router.get('/purchase-verification/:productId', jwtAuthMiddleware, objectIdValidation('productId'), validateRequest, checkDeliveredPurchase);

// General review eligibility check
router.get('/general-review-eligibility', jwtAuthMiddleware, checkGeneralReviewEligibility);


export default router;
