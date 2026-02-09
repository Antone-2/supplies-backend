import Joi from 'joi';

const pesapalPaymentSchema = Joi.object({
    orderId: Joi.string().required(),
    amount: Joi.number().min(1).required(),
    phone: Joi.string().min(10).required(),
    email: Joi.string().email().required(),
    description: Joi.string().allow('')
});

function validatePesapalPayment(data) {
    return pesapalPaymentSchema.validate(data);
}

export {
    pesapalPaymentSchema,
    validatePesapalPayment
};
