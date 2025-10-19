// reviewController.js
import Review from '../../Database/models/review.model.js';
import Product from '../../Database/models/product.model.js';
import { sendEmail } from '../services/emailService.js';

// Create a new review and send notification
export async function createReview(req, res) {
    try {
        const { productId, rating, comment } = req.body;
        const userId = req.user._id;

        // Validate input
        if (!productId || !rating || !comment) {
            return res.status(400).json({ message: 'Product ID, rating, and comment are required.' });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Rating must be between 1 and 5.' });
        }

        // Check if product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found.' });
        }

        // Check if user has successfully placed an order for this product
        const Order = (await import('../../Database/models/order.model.js')).default;
        const userOrder = await Order.findOne({
            user: userId,
            'items.productId': productId,
            orderStatus: { $in: ['processing', 'fulfilled', 'shipped', 'delivered'] },
            paymentStatus: 'paid'
        });

        if (!userOrder) {
            return res.status(403).json({
                message: 'You can only review products you have successfully purchased and paid for.',
                details: 'Reviews are only allowed for products from completed orders with successful payment.',
                help: 'Please ensure you have placed an order for this product and completed the payment process.'
            });
        }

        // Additional validation: Check if the order was delivered (preferred) or at least processed
        const isDelivered = userOrder.orderStatus === 'delivered';
        const isShipped = userOrder.orderStatus === 'shipped';
        const isFulfilled = userOrder.orderStatus === 'fulfilled';

        // Allow reviews for delivered orders immediately, shipped orders after 12 hours, fulfilled orders after 6 hours
        let minimumOrderAge = 0; // Delivered orders can be reviewed immediately

        if (isShipped) {
            minimumOrderAge = 12 * 60 * 60 * 1000; // 12 hours for shipped orders
        } else if (isFulfilled) {
            minimumOrderAge = 6 * 60 * 60 * 1000; // 6 hours for fulfilled orders
        } else if (userOrder.orderStatus === 'processing') {
            minimumOrderAge = 24 * 60 * 60 * 1000; // 24 hours for processing orders
        }

        if (minimumOrderAge > 0) {
            const orderAge = Date.now() - new Date(userOrder.createdAt).getTime();
            if (orderAge < minimumOrderAge) {
                const remainingHours = Math.ceil((minimumOrderAge - orderAge) / (60 * 60 * 1000));
                const waitingPeriod = isShipped ? '12 hours' : isFulfilled ? '6 hours' : '24 hours';

                return res.status(403).json({
                    message: `Please wait ${remainingHours} more hours before reviewing this product.`,
                    details: `We require a ${waitingPeriod} waiting period after ${userOrder.orderStatus} status to ensure product quality experience.`,
                    orderStatus: userOrder.orderStatus,
                    orderDate: userOrder.createdAt,
                    canReviewAt: new Date(userOrder.createdAt.getTime() + minimumOrderAge),
                    reason: `Order is ${userOrder.orderStatus} - reviews allowed after ${waitingPeriod}`
                });
            }
        }

        // Check if user already reviewed this product
        const existingReview = await Review.findOne({ product: productId, user: userId });
        if (existingReview) {
            return res.status(400).json({ message: 'You have already reviewed this product.' });
        }

        // Create review
        const review = new Review({
            product: productId,
            user: userId,
            rating,
            comment: comment.trim()
        });
        await review.save();

        // Populate user data for response
        await review.populate('user', 'name email');

        // Send notification to user
        const userEmail = req.user.email;
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">Thank you for your review!</h2>
                <p>Hi ${req.user.name},</p>
                <p>Thank you for taking the time to review our product. Your feedback helps other customers make informed decisions.</p>
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin: 0 0 10px 0;">Your Review:</h3>
                    <p><strong>Product:</strong> ${product.name}</p>
                    <p><strong>Rating:</strong> ${'⭐'.repeat(rating)} (${rating}/5)</p>
                    <p><strong>Comment:</strong> ${comment}</p>
                </div>
                <p>Thank you for choosing Medhelm Supplies!</p>
            </div>
        `;

        try {
            await sendEmail(userEmail, 'Review Submitted - Medhelm Supplies', html);
        } catch (emailError) {
            console.error('Error sending review notification email:', emailError);
            // Don't fail the review creation if email fails
        }

        res.status(201).json({
            message: 'Review submitted successfully!',
            review: {
                _id: review._id,
                product: review.product,
                user: review.user,
                rating: review.rating,
                comment: review.comment,
                createdAt: review.createdAt,
                updatedAt: review.updatedAt,
                verified: true,
                orderInfo: {
                    orderId: userOrder.orderNumber,
                    orderStatus: userOrder.orderStatus,
                    orderDate: userOrder.createdAt
                }
            }
        });
    } catch (error) {
        console.error('Error creating review:', error);
        res.status(500).json({ message: 'Failed to submit review.' });
    }
};

// Get reviews for a specific product
export async function getProductReviews(req, res) {
    try {
        const { productId } = req.params;
        const { page = 1, limit = 10 } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const reviews = await Review.find({ product: productId })
            .populate('user', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Review.countDocuments({ product: productId });

        res.json({
            reviews,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / parseInt(limit)),
                totalReviews: total,
                hasNext: page < Math.ceil(total / parseInt(limit)),
                hasPrev: page > 1
            }
        });
    } catch (error) {
        console.error('Error fetching product reviews:', error);
        res.status(500).json({ message: 'Failed to fetch reviews.' });
    }
};

// Get reviews by current user
export async function getUserReviews(req, res) {
    try {
        const userId = req.user._id;
        const { page = 1, limit = 10 } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const reviews = await Review.find({ user: userId })
            .populate('product', 'name image price')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Review.countDocuments({ user: userId });

        res.json({
            reviews,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / parseInt(limit)),
                totalReviews: total,
                hasNext: page < Math.ceil(total / parseInt(limit)),
                hasPrev: page > 1
            }
        });
    } catch (error) {
        console.error('Error fetching user reviews:', error);
        res.status(500).json({ message: 'Failed to fetch your reviews.' });
    }
};

// Update a review
export async function updateReview(req, res) {
    try {
        const { reviewId } = req.params;
        const { rating, comment } = req.body;
        const userId = req.user._id;

        // Validate input
        if (rating && (rating < 1 || rating > 5)) {
            return res.status(400).json({ message: 'Rating must be between 1 and 5.' });
        }

        // Find the review
        const review = await Review.findById(reviewId);
        if (!review) {
            return res.status(404).json({ message: 'Review not found.' });
        }

        // Check ownership
        if (review.user.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'You can only update your own reviews.' });
        }

        // Update review
        if (rating) review.rating = rating;
        if (comment) review.comment = comment.trim();

        await review.save();
        await review.populate('user', 'name email');

        res.json({
            message: 'Review updated successfully!',
            review
        });
    } catch (error) {
        console.error('Error updating review:', error);
        res.status(500).json({ message: 'Failed to update review.' });
    }
};

// Delete a review
export async function deleteReview(req, res) {
    try {
        const { reviewId } = req.params;
        const userId = req.user._id;

        // Find the review
        const review = await Review.findById(reviewId);
        if (!review) {
            return res.status(404).json({ message: 'Review not found.' });
        }

        // Check ownership
        if (review.user.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'You can only delete your own reviews.' });
        }

        await Review.findByIdAndDelete(reviewId);

        res.json({ message: 'Review deleted successfully!' });
    } catch (error) {
        console.error('Error deleting review:', error);
        res.status(500).json({ message: 'Failed to delete review.' });
    }
};
