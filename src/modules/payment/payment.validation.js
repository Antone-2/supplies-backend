const Joi = require('joi');

const pesapalPaymentSchema = Joi.object({
    orderId: Joi.string().required(),
    amount: Joi.number().min(1).required(),
    phone: Joi.string().min(10).required(), // More flexible phone validation
    email: Joi.string().email().required(),
    description: Joi.string().allow('')
});

function validatePesapalPayment(data) {
    return pesapalPaymentSchema.validate(data);
}

module.exports = {
    pesapalPaymentSchema,
    validatePesapalPayment
};
