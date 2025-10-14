import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    value: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    type: {
        type: String,
        enum: ['string', 'number', 'boolean', 'object'],
        default: 'string'
    }
}, {
    timestamps: true
});

// Index for efficient lookups
settingSchema.index({ key: 1 });

const Setting = mongoose.model('Setting', settingSchema);

export default Setting;
