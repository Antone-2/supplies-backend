// review.validation.js
const Joi = require('joi');

const reviewSchema = Joi.object({
    product: Joi.string().required(),
    user: Joi.string().required(),
    rating: Joi.number().min(1).max(5).required(),
    comment: Joi.string().allow(''),
    createdAt: Joi.date().optional(),
    updatedAt: Joi.date().optional()
});

function validateReview(review) {
    return reviewSchema.validate(review);
}

module.exports = {
    reviewSchema,
    validateReview
}; 