const Product = require('../../../Database/models/product.model');
const Category = require('../../../Database/models/category.model');
const redisClient = require('../../lib/redisClient');

// Get all products
const getProducts = async (req, res) => {
    try {
        console.log('getProducts called with query:', req.query);
        const { page = 1, limit = 12, category, sortBy = 'name', sortOrder = 'asc', inStock } = req.query;
        const cacheKey = `products:${page}:${limit}:${category || ''}:${sortBy}:${sortOrder}:${inStock || ''}`;
        // Temporarily skip Redis
        // const cached = await redisClient.get(cacheKey);
        // if (cached) {
        //     return res.json(JSON.parse(cached));
        // }
        const query = {};
        if (category) query.category = category;
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
const { validateProduct } = require('./product.validation');

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
                ]
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
        const product = await Product.findById(req.params.id).populate('category');
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

        const product = new Product({
            name: productData.name,
            description: productData.description || '',
            price: Number(productData.price),
            category: productData.category,
            brand: productData.brand || '',
            countInStock: Number(productData.countInStock) || 0,
            image: productData.image || '',
            images: productData.images || [],
            isFeatured: productData.isFeatured || false,
            isActive: true
        });

        await product.save();

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

        const product = await Product.findByIdAndUpdate(
            productId,
            { ...updates, updatedAt: new Date() },
            { new: true, runValidators: true }
        );

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

module.exports = { getProducts, createProduct, updateProduct, deleteProduct, getCategoriesWithCounts, getCategories, getProductsByCategory, getFeaturedProducts, getProductById };
