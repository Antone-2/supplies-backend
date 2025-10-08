const Joi = require('joi');

const productSchema = Joi.object({
    name: Joi.string().required(),
    description: Joi.string().allow(''),
    price: Joi.number().required(),
    image: Joi.string().allow(''),
    images: Joi.array().items(Joi.object({
        url: Joi.string().uri().required(),
        alt: Joi.string().allow('')
    })).optional(),
    category: Joi.string().required(),
    subcategory: Joi.string().allow(''),
    brand: Joi.string().allow(''),
    countInStock: Joi.number().integer().min(0).default(0),
    rating: Joi.number().min(0).max(5).default(0),
    numReviews: Joi.number().integer().min(0).default(0),
    isFeatured: Joi.boolean().default(false),
    featured: Joi.boolean().default(false),
    discount: Joi.number().min(0).default(0),
    sku: Joi.string().allow(''),
    tags: Joi.array().items(Joi.string()).optional(),
    weight: Joi.number().optional(),
    dimensions: Joi.object({
        length: Joi.number().optional(),
        width: Joi.number().optional(),
        height: Joi.number().optional()
    }).optional()
});

function validateProduct(product) {
    return productSchema.validate(product);
}

module.exports = {
    productSchema,
    validateProduct
};
