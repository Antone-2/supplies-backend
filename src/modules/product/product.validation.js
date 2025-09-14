// product.validation.js
const Joi = require('joi');

const productSchema = Joi.object({
    name: Joi.string().required(),
    description: Joi.string().allow(''),
    price: Joi.number().required(),
    category: Joi.string().required(),
    stock: Joi.number().integer().min(0).default(0),
    images: Joi.array().items(Joi.object({
        url: Joi.string().uri().required()
    })),
    originalPrice: Joi.number().optional(),
    rating: Joi.number().min(0).max(5).optional(),
    reviewCount: Joi.number().integer().min(0).optional()
});

function validateProduct(product) {
    return productSchema.validate(product);
}

module.exports = {
    productSchema,
    validateProduct
};