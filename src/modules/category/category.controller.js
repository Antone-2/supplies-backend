const Category = require('../../../Database/models/category.model');
const Product = require('../../../Database/models/product.model');

// Get all categories with product counts
exports.getCategoriesWithCounts = async (req, res) => {
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
        console.error('Error fetching categories:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch categories'
        });
    }
};

// Get single category by ID or slug
exports.getCategoryById = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await Category.findOne({
            $or: [
                { _id: id },
                { slug: id }
            ],
            isActive: true
        }).populate('parentCategory', 'name slug');

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        // Get product count
        const productCount = await Product.countDocuments({
            category: category._id,
            isActive: true
        });

        res.json({
            success: true,
            data: {
                ...category.toObject(),
                productCount
            }
        });
    } catch (err) {
        console.error('Error fetching category:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch category'
        });
    }
};

// Create new category
exports.createCategory = async (req, res) => {
    try {
        const { name, description, image, icon, color, parentCategory, displayOrder, seoTitle, seoDescription, tags } = req.body;

        // Check if category already exists
        const existingCategory = await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
        if (existingCategory) {
            return res.status(400).json({
                success: false,
                message: 'Category with this name already exists'
            });
        }

        const category = new Category({
            name,
            description,
            image,
            icon,
            color,
            parentCategory,
            displayOrder,
            seoTitle,
            seoDescription,
            tags
        });

        await category.save();

        // If this is a subcategory, add it to parent's subcategories
        if (parentCategory) {
            await Category.findByIdAndUpdate(parentCategory, {
                $push: { subcategories: category._id }
            });
        }

        res.status(201).json({
            success: true,
            data: category,
            message: 'Category created successfully'
        });
    } catch (err) {
        console.error('Error creating category:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to create category'
        });
    }
};

// Update category
exports.updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const category = await Category.findByIdAndUpdate(id, updates, {
            new: true,
            runValidators: true
        });

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        res.json({
            success: true,
            data: category,
            message: 'Category updated successfully'
        });
    } catch (err) {
        console.error('Error updating category:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to update category'
        });
    }
};

// Delete category
exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if category has products
        const productCount = await Product.countDocuments({ category: id });
        if (productCount > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete category with existing products. Please reassign products first.'
            });
        }

        // Check if category has subcategories
        const subcategoryCount = await Category.countDocuments({ parentCategory: id });
        if (subcategoryCount > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete category with subcategories. Please delete subcategories first.'
            });
        }

        const category = await Category.findByIdAndDelete(id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        // Remove from parent's subcategories if it's a subcategory
        if (category.parentCategory) {
            await Category.findByIdAndUpdate(category.parentCategory, {
                $pull: { subcategories: category._id }
            });
        }

        res.json({
            success: true,
            message: 'Category deleted successfully'
        });
    } catch (err) {
        console.error('Error deleting category:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to delete category'
        });
    }
};

// Get category tree (hierarchical structure)
exports.getCategoryTree = async (req, res) => {
    try {
        const categories = await Category.find({ isActive: true })
            .populate('subcategories', 'name slug productCount')
            .sort({ displayOrder: 1, name: 1 });

        // Build tree structure
        const buildTree = (categories, parentId = null) => {
            return categories
                .filter(cat => {
                    const catParentId = cat.parentCategory ? cat.parentCategory.toString() : null;
                    return catParentId === parentId;
                })
                .map(cat => ({
                    ...cat.toObject(),
                    children: buildTree(categories, cat._id.toString())
                }));
        };

        const tree = buildTree(categories);

        res.json({
            success: true,
            data: tree
        });
    } catch (err) {
        console.error('Error fetching category tree:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch category tree'
        });
    }
};
