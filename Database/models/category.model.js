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


categorySchema.pre('save', async function (next) {
    if (!this.slug && this.name) {

        let baseSlug = this.name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');


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