// newsletter.model.js
const mongoose = require('mongoose');

const newsletterSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    firstName: {
        type: String,
        trim: true,
        maxlength: 50
    },
    lastName: {
        type: String,
        trim: true,
        maxlength: 50
    },
    source: {
        type: String,
        enum: ['website', 'footer', 'inline', 'popup', 'other'],
        default: 'website'
    },
    subscribed: {
        type: Boolean,
        default: true
    },
    subscribedAt: {
        type: Date,
        default: Date.now
    },
    unsubscribedAt: {
        type: Date
    },
    preferences: {
        productUpdates: { type: Boolean, default: true },
        healthTips: { type: Boolean, default: true },
        promotions: { type: Boolean, default: true }
    }
}, {
    timestamps: true
});

// Index for better performance
newsletterSchema.index({ email: 1 });
newsletterSchema.index({ subscribed: 1 });
newsletterSchema.index({ subscribedAt: -1 });

const Newsletter = mongoose.model('Newsletter', newsletterSchema);
module.exports = Newsletter;
