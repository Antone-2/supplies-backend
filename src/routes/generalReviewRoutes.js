import express from 'express';
import * as generalReviewController from '../controllers/generalReviewController.js';
import jwtAuthMiddleware from '../middleware/jwtAuthMiddleware.js';
import jwt from 'jsonwebtoken';
import config from '../../config/index.js';
import User from '../Database/models/user.model.js';

const router = express.Router();


const optionalJwtAuth = async (req, res, next) => {
    const token = req.cookies.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    if (token) {
        try {
            const decoded = jwt.verify(token, config.jwtSecret);
            const user = await User.findById(decoded.id);
            if (user) {
                req.user = user;
            }
        } catch (err) {

            console.log('Invalid token in optional auth:', err.message);
        }
    }
    next();
};


router.get('/', generalReviewController.getGeneralReviews);


router.post('/', optionalJwtAuth, generalReviewController.createGeneralReview);


router.get('/my-review', jwtAuthMiddleware, generalReviewController.getUserGeneralReview);
router.put('/my-review', jwtAuthMiddleware, generalReviewController.updateGeneralReview);
router.delete('/my-review', jwtAuthMiddleware, generalReviewController.deleteGeneralReview);

export default router;
