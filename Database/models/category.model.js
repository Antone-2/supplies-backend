const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        description: {
            type: String,
            trim: true
        },
        slug: {
            type: String,
            unique: true,
            lowercase: true
        },
        image: {
            type: String
        },
        icon: {
            type: String
        },
        color: {
            type: String,
            default: '#3B82F6'
        },
        parentCategory: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            default: null
        },
        subcategories: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category'
        }],
        productCount: {
            type: Number,
            default: 0
        },
        isActive: {
            type: Boolean,
            default: true
        },
        displayOrder: {
            type: Number,
            default: 0
        },
        seoTitle: {
            type: String
        },
        seoDescription: {
            type: String
        },
        tags: [{
            type: String
        }]
    },
    {
        timestamps: true
    }
);

// Create slug from name before saving
categorySchema.pre('save', function (next) {
    if (this.isModified('name')) {
        this.slug = this.name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    }
    next();
});

// Index for better query performance
categorySchema.index({ slug: 1 });
categorySchema.index({ parentCategory: 1 });
categorySchema.index({ isActive: 1 });
categorySchema.index({ displayOrder: 1 });

module.exports = mongoose.model('Category', categorySchema);
