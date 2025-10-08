const Joi = require('joi');

const profileSchema = Joi.object({
    name: Joi.string().min(2).max(50).optional(),
    email: Joi.string().email().optional(),
    password: Joi.string().min(6).max(100).optional(),
    phone: Joi.string().min(7).max(20).optional()
});

function validateProfile(data) {
    return profileSchema.validate(data);
}

module.exports = { profileSchema, validateProfile };
