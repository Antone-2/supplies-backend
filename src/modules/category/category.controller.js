const Category = require('../../../Database/models/category.model');
const Product = require('../../../Database/models/product.model');

// Get all categories with product counts
const getCategoriesWithCounts = async (req, res) => {
    try {
        const categories = await Category.find({ isActive: true })
            .populate('parentCategory', 'name')
            .sort({ displayOrder: 1, name: 1 });

        // Get product counts for each category
        const categoriesWithCounts = await Promise.all(
            categories.map(async (category) => {
                const productCount = await Product.countDocuments({
                    category: category._id,
                    isActive: true
                });

                return {
                    _id: category._id,
                    name: category.name,
                    slug: category.slug,
                    description: category.description,
                    image: category.image,
                    icon: category.icon,
                    color: category.color,
                    productCount,
                    parentCategory: category.parentCategory,
                    subcategories: category.subcategories,
                    displayOrder: category.displayOrder
                };
            })
        );

        res.json({
            success: true,
            data: categoriesWithCounts
        });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch categories' });
    }
};

// Get category tree
const getCategoryTree = async (req, res) => {
    try {
        // Placeholder
        res.json({ categories: [] });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch category tree' });
    }
};

// Get category by ID
const getCategoryById = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) return res.status(404).json({ message: 'Category not found' });
        res.json({ category });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch category' });
    }
};

// Create category
const createCategory = async (req, res) => {
    try {
        const category = new Category(req.body);
        await category.save();
        res.status(201).json({ category });
    } catch (err) {
        res.status(400).json({ message: 'Failed to create category', error: err.message });
    }
};

// Update category
const updateCategory = async (req, res) => {
    try {
        const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!category) return res.status(404).json({ message: 'Category not found' });
        res.json({ category });
    } catch (err) {
        res.status(400).json({ message: 'Failed to update category', error: err.message });
    }
};

// Delete category
const deleteCategory = async (req, res) => {
    try {
        const category = await Category.findByIdAndDelete(req.params.id);
        if (!category) return res.status(404).json({ message: 'Category not found' });
        res.json({ message: 'Category deleted' });
    } catch (err) {
        res.status(400).json({ message: 'Failed to delete category', error: err.message });
    }
};

module.exports = { getCategoriesWithCounts, getCategoryTree, getCategoryById, createCategory, updateCategory, deleteCategory };
