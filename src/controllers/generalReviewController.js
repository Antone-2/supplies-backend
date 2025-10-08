// generalReviewController.js
const GeneralReview = require('../../Database/models/generalReview.model');
const { sendEmail } = require('../utils/emailService');

// Create a new general review
exports.createGeneralReview = async (req, res) => {
    try {
        const { name, email, rating, title, comment } = req.body;
        const userId = req.user ? req.user._id : null;

        // Validate input
        if (!name || !email || !rating || !title || !comment) {
            return res.status(400).json({
                message: 'Name, email, rating, title, and comment are required.'
            });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({
                message: 'Rating must be between 1 and 5.'
            });
        }

        // Check if user already submitted a general review (if authenticated)
        if (userId) {
            const existingReview = await GeneralReview.findOne({ user: userId });
            if (existingReview) {
                return res.status(400).json({
                    message: 'You have already submitted a review. You can update your existing review.'
                });
            }
        }

        // Create review
        const review = new GeneralReview({
            user: userId,
            name: name.trim(),
            email: email.trim(),
            rating,
            title: title.trim(),
            comment: comment.trim(),
            isVerified: !!userId // Mark as verified if user is authenticated
        });

        await review.save();

        // Populate user data for response
        if (userId) {
            await review.populate('user', 'name email');
        }

        // Send confirmation email
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">Thank you for your review!</h2>
                <p>Hi ${name},</p>
                <p>Thank you for taking the time to share your experience with MEDHELM Supplies. Your feedback is valuable to us and helps other customers.</p>
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin: 0 0 10px 0;">Your Review:</h3>
                    <p><strong>Title:</strong> ${title}</p>
                    <p><strong>Rating:</strong> ${'⭐'.repeat(rating)} (${rating}/5)</p>
                    <p><strong>Comment:</strong> ${comment}</p>
                </div>
                <p>Your review will appear on our website after approval (usually within 24 hours).</p>
                <p>Thank you for choosing MEDHELM!</p>
            </div>
        `;

        try {
            await sendEmail(email, 'Review Submitted - MEDHELM Supplies', html);
        } catch (emailError) {
            console.error('Error sending review confirmation email:', emailError);
            // Don't fail the review creation if email fails
        }

        res.status(201).json({
            message: 'Review submitted successfully! Thank you for your feedback.',
            review: {
                _id: review._id,
                name: review.name,
                rating: review.rating,
                title: review.title,
                comment: review.comment,
                isVerified: review.isVerified,
                createdAt: review.createdAt
            }
        });
    } catch (error) {
        console.error('Error creating general review:', error);
        res.status(500).json({ message: 'Failed to submit review. Please try again.' });
    }
};

// Get all approved general reviews (for homepage display)
exports.getGeneralReviews = async (req, res) => {
    try {
        const { page = 1, limit = 20, featured = false } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        let query = { isApproved: true };
        if (featured === 'true') {
            query.isFeatured = true;
        }

        const reviews = await GeneralReview.find(query)
            .populate('user', 'name')
            .select('-email -user.email') // Don't expose email addresses
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        const total = await GeneralReview.countDocuments(query);

        // Calculate average rating
        const ratingStats = await GeneralReview.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    averageRating: { $avg: '$rating' },
                    totalReviews: { $sum: 1 },
                    ratingDistribution: {
                        $push: '$rating'
                    }
                }
            }
        ]);

        const stats = ratingStats[0] || {
            averageRating: 0,
            totalReviews: 0,
            ratingDistribution: []
        };

        res.json({
            reviews,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / parseInt(limit)),
                totalReviews: total,
                hasNext: page < Math.ceil(total / parseInt(limit)),
                hasPrev: page > 1
            },
            stats: {
                averageRating: Math.round(stats.averageRating * 10) / 10,
                totalReviews: stats.totalReviews
            }
        });
    } catch (error) {
        console.error('Error fetching general reviews:', error);
        res.status(500).json({ message: 'Failed to fetch reviews.' });
    }
};

// Get user's own general review
exports.getUserGeneralReview = async (req, res) => {
    try {
        const userId = req.user._id;

        const review = await GeneralReview.findOne({ user: userId })
            .populate('user', 'name email')
            .sort({ createdAt: -1 });

        if (!review) {
            return res.status(404).json({ message: 'No review found.' });
        }

        res.json({ review });
    } catch (error) {
        console.error('Error fetching user general review:', error);
        res.status(500).json({ message: 'Failed to fetch your review.' });
    }
};

// Update user's general review
exports.updateGeneralReview = async (req, res) => {
    try {
        const { rating, title, comment } = req.body;
        const userId = req.user._id;

        // Validate input
        if (rating && (rating < 1 || rating > 5)) {
            return res.status(400).json({ message: 'Rating must be between 1 and 5.' });
        }

        // Find the user's review
        const review = await GeneralReview.findOne({ user: userId });
        if (!review) {
            return res.status(404).json({ message: 'Review not found.' });
        }

        // Update review
        if (rating) review.rating = rating;
        if (title) review.title = title.trim();
        if (comment) review.comment = comment.trim();

        await review.save();

        res.json({
            message: 'Review updated successfully!',
            review: {
                _id: review._id,
                name: review.name,
                rating: review.rating,
                title: review.title,
                comment: review.comment,
                isVerified: review.isVerified,
                createdAt: review.createdAt,
                updatedAt: review.updatedAt
            }
        });
    } catch (error) {
        console.error('Error updating general review:', error);
        res.status(500).json({ message: 'Failed to update review.' });
    }
};

// Delete user's general review
exports.deleteGeneralReview = async (req, res) => {
    try {
        const userId = req.user._id;

        const review = await GeneralReview.findOne({ user: userId });
        if (!review) {
            return res.status(404).json({ message: 'Review not found.' });
        }

        await GeneralReview.findByIdAndDelete(review._id);

        res.json({ message: 'Review deleted successfully!' });
    } catch (error) {
        console.error('Error deleting general review:', error);
        res.status(500).json({ message: 'Failed to delete review.' });
    }
};