import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true },
    slug: { type: String, unique: true, lowercase: true },
    image: { type: String },
    icon: { type: String },
    color: { type: String, default: '#3B82F6' },
    parentCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    subcategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    productCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
    seoTitle: { type: String },
    seoDescription: { type: String },
    tags: [{ type: String }]
});

// Pre-save hook to generate slug from name if not provided
categorySchema.pre('save', async function (next) {
    if (!this.slug && this.name) {
        // Generate slug from name: lowercase, replace spaces and special chars with hyphens, remove leading/trailing hyphens
        let baseSlug = this.name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .replace(/-+/g, '-') // Replace multiple hyphens with single
            .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

        // Ensure uniqueness by checking existing slugs (excluding current document)
        let slug = baseSlug;
        let counter = 1;
        while (await mongoose.models.Category.findOne({ slug, _id: { $ne: this._id } })) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }
        this.slug = slug;
    }
    next();
});

const Category = mongoose.model('Category', categorySchema);
export default Category;
