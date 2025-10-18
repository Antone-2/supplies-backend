import Product from '../../../Database/models/product.model.js';
import Category from '../../../Database/models/category.model.js';
import mongoose from 'mongoose';
import redisClient from '../../lib/redisClient.js';

// Get all products
const getProducts = async (req, res) => {
    try {
        console.log('getProducts called with query:', req.query);
        const { page = 1, limit = 12, category, sortBy = 'name', sortOrder = 'asc', inStock, admin, showAll, includeInactive } = req.query;
        const cacheKey = `products:${page}:${limit}:${category || ''}:${sortBy}:${sortOrder}:${inStock || ''}`;
        // Temporarily skip Redis
        // const cached = await redisClient.get(cacheKey);
        // if (cached) {
        //     return res.json(JSON.parse(cached));
        // }

        // Allow admin access to all products or inactive products if specified
        let query = {};
        if (admin === 'true' || showAll === 'true' || includeInactive === 'true') {
            // Admin can see all products
            query = {};
        } else {
            // Public API only shows active products
            query = { isActive: true };
        }
        if (category) {
            // Handle category - if it's a string, find the category ObjectId
            if (typeof category === 'string') {
                // First try to find by name
                let categoryDoc = await Category.findOne({ name: category });
                if (categoryDoc) {
                    query.category = categoryDoc._id;
                } else {
                    // If not found by name, check if it's a valid ObjectId
                    if (mongoose.Types.ObjectId.isValid(category)) {
                        query.category = category;
                    } else {
                        // If category not found, return empty results
                        return res.json({
                            products: [],
                            page: parseInt(page),
                            limit: parseInt(limit),
                            total: 0,
                            totalPages: 0
                        });
                    }
                }
            } else {
                query.category = category;
            }
        }
        if (inStock) query.countInStock = { $gt: 0 };

        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Run both queries in parallel for better performance
        const [products, total] = await Promise.all([
            Product.find(query, {
                // Only select necessary fields
                name: 1,
                price: 1,
                image: 1,
                images: 1,
                category: 1,
                countInStock: 1,
                rating: 1,
                numReviews: 1,
                isFeatured: 1,
                featured: 1,
                discount: 1,
                description: 1,
                brand: 1,
                sku: 1
            })
                .sort(sortOptions)
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Product.countDocuments(query)
        ]);

        console.log('Products found:', products.length);
        const response = {
            products,
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / parseInt(limit))
        };
        // Temporarily skip Redis caching for debugging
        // await redisClient.setEx(cacheKey, 60, JSON.stringify(response)); // cache for 60 seconds
        res.json(response);
    } catch (err) {
        console.error('Error fetching products:', err);
        res.status(500).json({ message: 'Failed to fetch products', details: err.message });
    }
};

// Import validation
import { validateProduct } from './product.validation.js';

// Get categories with counts
const getCategoriesWithCounts = async (req, res) => {
    try {
        const categories = await Product.aggregate([
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
            { $unwind: '$category' },
            { $project: { name: '$category.name', count: 1 } }
        ]);
        res.json({ categories });
    } catch (err) {
        console.error('Error fetching categories with counts:', err);
        res.status(500).json({ message: 'Failed to fetch categories', details: err.message });
    }
};

// Get all unique categories
const getCategories = async (req, res) => {
    try {
        const categories = await Product.distinct('category');
        res.json({ categories });
    } catch (err) {
        console.error('Error fetching categories:', err);
        res.status(500).json({ message: 'Failed to fetch categories', details: err.message });
    }
};

// Get products by category
const getProductsByCategory = async (req, res) => {
    try {
        const { category } = req.params;
        const { page = 1, limit = 12 } = req.query;
        const query = { category };
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const products = await Product.find(query).skip(skip).limit(parseInt(limit));
        const total = await Product.countDocuments(query);
        res.json({
            products,
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / parseInt(limit))
        });
    } catch (err) {
        console.error('Error fetching products by category:', err);
        res.status(500).json({ message: 'Failed to fetch products', details: err.message });
    }
};

// Get featured products with caching and optimization
const getFeaturedProducts = async (req, res) => {
    try {
        console.log('getFeaturedProducts called with query:', req.query);
        const { limit = 8 } = req.query;
        const cacheKey = `featured_products:${limit}`;

        // Temporarily skip Redis to debug the issue
        // const cached = await redisClient.get(cacheKey);
        // if (cached) {
        //     return res.json(JSON.parse(cached));
        // }
        console.log('Querying database for featured products...');

        // Optimized query with selected fields only
        const products = await Product.find(
            {
                $or: [
                    { isFeatured: true },
                    { featured: true }
                ],
                isActive: true
            },
            {
                // Only select necessary fields to reduce data transfer
                name: 1,
                price: 1,
                image: 1,
                images: 1,
                category: 1,
                countInStock: 1,
                rating: 1,
                numReviews: 1,
                isFeatured: 1,
                featured: 1,
                discount: 1,
                description: 1,
                brand: 1
            }
        )
            .limit(parseInt(limit))
            .lean(); // Use lean() for faster queries

        console.log('Featured products found:', products.length);
        const response = { products };

        // Temporarily skip Redis caching
        // await redisClient.setEx(cacheKey, 300, JSON.stringify(response));

        res.json(response);
    } catch (err) {
        console.error('Error fetching featured products:', err);
        res.status(500).json({ message: 'Failed to fetch featured products', details: err.message });
    }
};

// Get product by ID
const getProductById = async (req, res) => {
    try {
        const product = await Product.findOne({ _id: req.params.id, isActive: true }).populate('category');
        if (!product) return res.status(404).json({ message: 'Product not found' });
        res.json({ product });
    } catch (err) {
        console.error('Error fetching product by ID:', err);
        res.status(500).json({ message: 'Failed to fetch product', details: err.message });
    }
};

// Create product (Admin only)
const createProduct = async (req, res) => {
    try {
        const productData = req.body;

        // Validate required fields
        if (!productData.name || !productData.price || !productData.category) {
            return res.status(400).json({
                message: 'Missing required fields: name, price, category'
            });
        }

        // Handle category - if it's a string, find the category ObjectId
        let categoryId = productData.category;
        if (typeof categoryId === 'string') {
            const Category = (await import('../../../Database/models/category.model.js')).default;
            const category = await Category.findOne({ name: categoryId });
            if (category) {
                categoryId = category._id;
            } else {
                // Generate slug for new category
                let slug = categoryId
                    .toLowerCase()
                    .trim()
                    .replace(/[^a-z0-9\s-]/g, '')
                    .replace(/\s+/g, '-')
                    .replace(/-+/g, '-')
                    .replace(/^-|-$/g, '');

                // Ensure uniqueness
                let uniqueSlug = slug;
                let counter = 1;
                while (await Category.findOne({ slug: uniqueSlug })) {
                    uniqueSlug = `${slug}-${counter}`;
                    counter++;
                }

                // Create category if it doesn't exist
                const newCategory = new Category({ name: categoryId, slug: uniqueSlug });
                await newCategory.save();
                categoryId = newCategory._id;
            }
        }

        const product = new Product({
            name: productData.name,
            description: productData.description || '',
            price: Number(productData.price),
            category: categoryId,
            brand: productData.brand || '',
            countInStock: Number(productData.countInStock) || 0,
            image: productData.image || '',
            images: productData.images || [],
            isFeatured: productData.isFeatured || false,
            featured: productData.featured || false,
            discount: Number(productData.discount) || 0,
            rating: Number(productData.rating) || 0,
            numReviews: Number(productData.numReviews) || 0,
            isActive: true
        });

        await product.save();

        // Populate category for response
        await product.populate('category');

        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            product
        });
    } catch (err) {
        console.error('Error creating product:', err);
        res.status(500).json({
            message: 'Failed to create product',
            error: err.message
        });
    }
};

// Update product (Admin only)
const updateProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const updates = req.body;

        // Handle category update - if it's a string, find the category ObjectId
        if (updates.category && typeof updates.category === 'string') {
            const Category = (await import('../../../Database/models/category.model.js')).default;
            const category = await Category.findOne({ name: updates.category });
            if (category) {
                updates.category = category._id;
            } else {
                // Generate slug for new category
                let slug = updates.category
                    .toLowerCase()
                    .trim()
                    .replace(/[^a-z0-9\s-]/g, '')
                    .replace(/\s+/g, '-')
                    .replace(/-+/g, '-')
                    .replace(/^-|-$/g, '');

                // Ensure uniqueness
                let uniqueSlug = slug;
                let counter = 1;
                while (await Category.findOne({ slug: uniqueSlug })) {
                    uniqueSlug = `${slug}-${counter}`;
                    counter++;
                }

                // Create category if it doesn't exist
                const newCategory = new Category({ name: updates.category, slug: uniqueSlug });
                await newCategory.save();
                updates.category = newCategory._id;
            }
        }

        const product = await Product.findByIdAndUpdate(
            productId,
            { ...updates, updatedAt: new Date() },
            { new: true, runValidators: true }
        ).populate('category');

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.json({
            success: true,
            message: 'Product updated successfully',
            product
        });
    } catch (err) {
        console.error('Error updating product:', err);
        res.status(500).json({
            message: 'Failed to update product',
            error: err.message
        });
    }
};

// Delete product (Admin only)
const deleteProduct = async (req, res) => {
    try {
        const productId = req.params.id;

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Soft delete - set isActive to false instead of deleting
        product.isActive = false;
        await product.save();

        res.json({
            success: true,
            message: 'Product deleted successfully'
        });
    } catch (err) {
        console.error('Error deleting product:', err);
        res.status(500).json({
            message: 'Failed to delete product',
            error: err.message
        });
    }
};

// Get all products for admin (no pagination, all fields)
const getAllProducts = async (req, res) => {
    try {
        console.log('getAllProducts called for admin');
        // Admin should see all products, including inactive ones
        const products = await Product.find({})
            .populate('category')
            .sort({ createdAt: -1 })
            .lean();

        console.log('All products found:', products.length);
        res.json({ products });
    } catch (err) {
        console.error('Error fetching all products:', err);
        res.status(500).json({ message: 'Failed to fetch all products', details: err.message });
    }
};

export { getProducts, createProduct, updateProduct, deleteProduct, getCategoriesWithCounts, getCategories, getProductsByCategory, getFeaturedProducts, getProductById, getAllProducts };
