const Joi = require('joi');

const wishlistSchema = Joi.object({
    user: Joi.string().required(),
    products: Joi.array().items(Joi.string()).default([])
});

function validateWishlist(wishlist) {
    return wishlistSchema.validate(wishlist);
}

module.exports = {
    wishlistSchema,
    validateWishlist
};
