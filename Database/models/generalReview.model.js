const mongoose = require('mongoose');

// General reviews schema for homepage testimonials/reviews
const generalReviewSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false  // Allow guest reviews
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    comment: {
        type: String,
        required: true,
        trim: true
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    isApproved: {
        type: Boolean,
        default: true // Auto-approve for now, can be changed to false for moderation
    },
    isFeatured: {
        type: Boolean,
        default: false // For featuring on homepage
    }
}, {
    timestamps: true
});

// Index for better query performance
generalReviewSchema.index({ createdAt: -1 });
generalReviewSchema.index({ isApproved: 1, isFeatured: 1 });

const GeneralReview = mongoose.model('GeneralReview', generalReviewSchema);
module.exports = GeneralReview;