// user.validation.js
const Joi = require('joi');

const userSchema = Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('user', 'admin').default('user'),
    verified: Joi.boolean().default(false)
});

function validateUser(user) {
    return userSchema.validate(user);
}

module.exports = {
    userSchema,
    validateUser
};