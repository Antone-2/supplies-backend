const Joi = require('joi');

const orderSchema = Joi.object({
    user: Joi.string().required(),
    items: Joi.array().items(Joi.object({
        productId: Joi.string().required(),
        quantity: Joi.number().integer().min(1).required()
    })).min(1).required(),
    total: Joi.number().min(0).required(),
    address: Joi.string().required(),
    paymentMethod: Joi.string().valid('cash', 'mpesa', 'airtel', 'pesapal').required(),
    note: Joi.string().allow(''),
});

function validateOrder(order) {
    return orderSchema.validate(order);
}

module.exports = {
    orderSchema,
    validateOrder
};
