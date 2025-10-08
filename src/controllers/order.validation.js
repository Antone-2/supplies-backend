const Joi = require('joi');

const addressSchema = Joi.object({
  fullName: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().pattern(/^\+2547\d{8}$/).required(),
  address: Joi.string().min(5).max(100).required(),
  city: Joi.string().min(2).max(50).required(),
  county: Joi.string().min(2).max(50).required(),
  postalCode: Joi.string().min(1).max(20).optional(),
  deliveryLocation: Joi.string().min(2).max(50).required()
});

const orderSchema = Joi.object({
  items: Joi.array().items(Joi.object({
    product: Joi.string().required(),
    quantity: Joi.number().integer().min(1).required(),
    price: Joi.number().min(0).required()
  })).min(1).required(),
  shippingAddress: addressSchema.required(),
  totalAmount: Joi.number().min(0).required(),
  paymentMethod: Joi.string().valid('pesapal').required()
});

function validateOrder(order) {
  return orderSchema.validate(order);
}

module.exports = { addressSchema, orderSchema, validateOrder };
