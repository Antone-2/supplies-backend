const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        description: { type: String },
        price: { type: Number, required: true },
        image: { type: String },
        images: [{ url: { type: String }, alt: { type: String } }],
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            required: true
        },
        subcategory: { type: String },
        brand: { type: String },
        countInStock: { type: Number, default: 0 },
        rating: { type: Number, default: 0 },
        numReviews: { type: Number, default: 0 },
        isFeatured: { type: Boolean, default: false },
        featured: { type: Boolean, default: false },
        discount: { type: Number, default: 0 },
        sku: { type: String },
        tags: [{ type: String }],
        weight: { type: Number },
        dimensions: {
            length: { type: Number },
            width: { type: Number },
            height: { type: Number }
        },
        manufacturer: { type: String },
        expiryDate: { type: Date },
        batchNumber: { type: String },
        isActive: { type: Boolean, default: true }
    },
    { timestamps: true }
);

// Index for better query performance
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ price: 1 });
productSchema.index({ rating: 1 });

module.exports = mongoose.model('Product', productSchema);
