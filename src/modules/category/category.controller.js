import Category from '../../../Database/models/category.model.js';
import Product from '../../../Database/models/product.model.js';

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
        const categoryId = req.params.id;

        // Check if category exists
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        // Check if category has products
        const productCount = await Product.countDocuments({ category: categoryId });
        if (productCount > 0) {
            return res.status(400).json({
                message: `Cannot delete category. It contains ${productCount} product(s). Please reassign or delete the products first.`,
                productCount
            });
        }

        // Check if category has subcategories
        const subcategoryCount = await Category.countDocuments({ parentCategory: categoryId });
        if (subcategoryCount > 0) {
            return res.status(400).json({
                message: `Cannot delete category. It has ${subcategoryCount} subcategory(ies). Please delete subcategories first.`,
                subcategoryCount
            });
        }

        // Safe to delete
        await Category.findByIdAndDelete(categoryId);

        res.json({
            success: true,
            message: 'Category deleted successfully'
        });
    } catch (err) {
        console.error('Delete category error:', err);
        res.status(500).json({
            message: 'Failed to delete category',
            error: err.message
        });
    }
};

export { getCategoriesWithCounts, getCategoryTree, getCategoryById, createCategory, updateCategory, deleteCategory };
