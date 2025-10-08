const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    image: { type: String },
    images: [{ url: { type: String }, alt: { type: String } }],
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
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
    }
});

productSchema.index({ name: 1 });
productSchema.index({ category: 1 });
productSchema.index({ isFeatured: 1 });
const Product = mongoose.model('Product', productSchema);
module.exports = Product;
