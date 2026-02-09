import Category from '../../../../Database/models/category.model.js';
import Product from '../../../../Database/models/product.model.js';


const getCategoriesWithCounts = async (req, res) => {
    try {
        console.log(' Fetching categories with counts...');


        const categories = await Category.find({})
            .populate('parentCategory', 'name')
            .sort({ displayOrder: 1, name: 1 })
            .limit(100);

        console.log(` Found ${categories.length} categories in database`);


        const categoriesWithCounts = await Promise.all(
            categories.map(async (category) => {

                const productCount = await Product.countDocuments({
                    $or: [
                        { category: category._id },
                        { category: category._id.toString() },
                        { category: category.name },
                        { category: { $regex: new RegExp(`^${category.name}$`, 'i') } }
                    ]
                });

                console.log(` Category "${category.name}": ${productCount} products`);

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
                    displayOrder: category.displayOrder,
                    isActive: category.isActive,
                    status: category.isActive ? 'Active' : 'Inactive'
                };
            })
        );

        console.log(` Returning ${categoriesWithCounts.length} categories with product counts`);

        res.json({
            success: true,
            data: categoriesWithCounts,
            total: categoriesWithCounts.length
        });
    } catch (err) {
        console.error(' Error fetching categories:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch categories',
            error: err.message
        });
    }
};


const getCategoryTree = async (req, res) => {
    try {

        res.json({
            success: true,
            categories: []
        });
    } catch (err) {
        console.error('Error fetching category tree:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch category tree',
            error: err.message
        });
    }
};


const getCategoryById = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) return res.status(404).json({
            success: false,
            message: 'Category not found'
        });
        res.json({
            success: true,
            category
        });
    } catch (err) {
        console.error('Error fetching category by ID:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch category',
            error: err.message
        });
    }
};


const createCategory = async (req, res) => {
    try {
        const category = new Category(req.body);
        await category.save();
        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            category
        });
    } catch (err) {
        console.error('Error creating category:', err);
        res.status(400).json({
            success: false,
            message: 'Failed to create category',
            error: err.message
        });
    }
};


const updateCategory = async (req, res) => {
    try {
        const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!category) return res.status(404).json({
            success: false,
            message: 'Category not found'
        });
        res.json({
            success: true,
            message: 'Category updated successfully',
            category
        });
    } catch (err) {
        console.error('Error updating category:', err);
        res.status(400).json({
            success: false,
            message: 'Failed to update category',
            error: err.message
        });
    }
};


const deleteCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;


        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }


        const productCount = await Product.countDocuments({
            $or: [
                { category: categoryId },
                { category: categoryId.toString() },
                { category: category.name }
            ]
        });
        if (productCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete category. It contains ${productCount} product(s). Please reassign or delete the products first.`,
                productCount
            });
        }


        const subcategoryCount = await Category.countDocuments({ parentCategory: categoryId });
        if (subcategoryCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete category. It has ${subcategoryCount} subcategory(ies). Please delete subcategories first.`,
                subcategoryCount
            });
        }


        await Category.findByIdAndDelete(categoryId);

        res.json({
            success: true,
            message: 'Category deleted successfully'
        });
    } catch (err) {
        console.error('Delete category error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to delete category',
            error: err.message
        });
    }
};

export { getCategoriesWithCounts, getCategoryTree, getCategoryById, createCategory, updateCategory, deleteCategory };