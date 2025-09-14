const { get: cacheGet, set: cacheSet, del: cacheDel } = require('../../utils/cache');

// Get all unique categories (legacy - use category module instead)
exports.getCategories = async (req, res) => {
    try {
        const categories = await Category.find({ isActive: true })
            .select('name slug description')
            .sort({ displayOrder: 1, name: 1 });
        res.json({ success: true, data: categories });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch categories' });
    }
};

// Get all categories with product counts (legacy - use category module instead)
exports.getCategoriesWithCounts = async (req, res) => {
    try {
        const cacheKey = 'categories:withCounts:v1';
        const cached = await cacheGet(cacheKey);
        if (cached) return res.json({ success: true, data: cached, cached: true });

        const categories = await Category.find({ isActive: true })
            .select('name slug description image icon color')
            .sort({ displayOrder: 1, name: 1 });
        const categoriesWithCounts = await Promise.all(
            categories.map(async (category) => {
                const productCount = await Product.countDocuments({ category: category._id, isActive: true });
                return {
                    _id: category._id,
                    name: category.name,
                    slug: category.slug,
                    description: category.description,
                    image: category.image,
                    icon: category.icon,
                    color: category.color,
                    productCount
                };
            })
        );
        cacheSet(cacheKey, categoriesWithCounts, 300); // 5 min TTL
        res.json({ success: true, data: categoriesWithCounts });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch categories' });
    }
};
// product.controller.js
const Product = require('../../../Database/models/product.model');
const Category = require('../../../Database/models/category.model');

// Get all products
exports.getProducts = async (req, res) => {
    try {
        const { page = 1, limit = 12, category, sortBy = 'name', sortOrder = 'asc', inStock } = req.query;

        let query = {};
        if (category && category !== 'all') {
            // Find category by slug or id
            const categoryDoc = await Category.findOne({
                $or: [{ _id: category }, { slug: category }]
            });
            if (categoryDoc) {
                query.category = categoryDoc._id;
            } else {
                // If category not found, return empty result
                return res.json({
                    success: true,
                    data: {
                        products: [],
                        pagination: {
                            totalProducts: 0,
                            totalPages: 0,
                            currentPage: 1,
                            hasNext: false,
                            hasPrev: false
                        }
                    }
                });
            }
        }
        if (inStock === 'true') {
            query.countInStock = { $gt: 0 };
        }

        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const cacheKey = `products:all:${JSON.stringify({ page, limit, category: query.category || 'all', sortBy, sortOrder, inStock })}`;
        const cached = await cacheGet(cacheKey);
        if (cached) return res.json(cached);

        const totalProducts = await Product.countDocuments(query);
        const totalPages = Math.ceil(totalProducts / limit);
        const skip = (page - 1) * limit;

        const products = await Product.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit))
            .populate('category', 'name slug');

        const responsePayload = {
            success: true,
            data: {
                products: products.map(p => {
                    const obj = p.toObject();
                    let images = [];
                    if (Array.isArray(obj.images) && obj.images.length > 0) images = obj.images;
                    else if (typeof obj.image === 'string' && obj.image.length > 0) images = [{ url: obj.image, alt: obj.name }];
                    return { ...obj, stock: p.countInStock, images };
                }),
                pagination: {
                    totalProducts,
                    totalPages,
                    currentPage: parseInt(page),
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                }
            }
        };
        cacheSet(cacheKey, responsePayload, 120); // 2 min TTL
        res.json(responsePayload);
    } catch (err) {
        console.error('Error fetching products:', err);
        res.status(500).json({ message: 'Failed to fetch products' });
    }
};

exports.getProductsByCategory = async (req, res) => {
    try {
        const { category } = req.params;
        const { page = 1, limit = 12, sortBy = 'name', sortOrder = 'asc', inStock } = req.query;

        let query = {};
        // Only filter by category if it's not 'all'
        if (category && category !== 'all') {
            // Find category by slug or id
            const categoryDoc = await Category.findOne({
                $or: [{ _id: category }, { slug: category }]
            });
            if (categoryDoc) {
                query.category = categoryDoc._id;
            } else {
                // If category not found, return empty result
                return res.json({
                    success: true,
                    data: {
                        products: [],
                        pagination: {
                            totalProducts: 0,
                            totalPages: 0,
                            currentPage: 1,
                            hasNext: false,
                            hasPrev: false
                        }
                    }
                });
            }
        }
        if (inStock === 'true') {
            query.countInStock = { $gt: 0 };
        }

        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const cacheKey = `products:byCategory:${JSON.stringify({ page, limit, category: query.category || 'all', sortBy, sortOrder, inStock })}`;
        const cached = await cacheGet(cacheKey);
        if (cached) return res.json(cached);

        const totalProducts = await Product.countDocuments(query);
        const totalPages = Math.ceil(totalProducts / limit);
        const skip = (page - 1) * limit;

        const products = await Product.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit))
            .populate('category', 'name slug');

        const responsePayload = {
            success: true,
            data: {
                products: products.map(p => {
                    const obj = p.toObject();
                    let images = [];
                    if (Array.isArray(obj.images) && obj.images.length > 0) images = obj.images;
                    else if (typeof obj.image === 'string' && obj.image.length > 0) images = [{ url: obj.image, alt: obj.name }];
                    return { ...obj, stock: p.countInStock, images };
                }),
                pagination: {
                    totalProducts,
                    totalPages,
                    currentPage: parseInt(page),
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                }
            }
        };
        cacheSet(cacheKey, responsePayload, 120);
        res.json(responsePayload);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch products by category' });
    }
};

// Get all featured products
exports.getFeaturedProducts = async (req, res) => {
    try {
        const products = await Product.find({ featured: true }).populate('category', 'name slug');
        const mappedProducts = products.map(p => {
            const obj = p.toObject();
            // Always provide an images array for frontend compatibility
            let images = [];
            if (Array.isArray(obj.images) && obj.images.length > 0) {
                images = obj.images;
            } else if (typeof obj.image === 'string' && obj.image.length > 0) {
                images = [{ url: obj.image, alt: obj.name }];
            }
            return {
                ...obj,
                stock: p.countInStock,
                images
            };
        });
        res.json({ success: true, data: mappedProducts });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch featured products' });
    }
};

// Get single product by ID
exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: 'Product not found' });
        res.json(product);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch product' });
    }
};

// Create new product
exports.createProduct = async (req, res) => {
    try {
        const product = new Product(req.body);
        await product.save();
        await cacheDel('products:*');
        await cacheDel('categories:*');
        res.status(201).json(product);
    } catch (err) {
        res.status(400).json({ message: 'Failed to create product' });
    }
};

// Update product
exports.updateProduct = async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!product) return res.status(404).json({ message: 'Product not found' });
        await cacheDel('products:*');
        await cacheDel('categories:*');
        res.json(product);
    } catch (err) {
        res.status(400).json({ message: 'Failed to update product' });
    }
};

// Delete product
exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) return res.status(404).json({ message: 'Product not found' });
        await cacheDel('products:*');
        await cacheDel('categories:*');
        res.json({ message: 'Product deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete product' });
    }
};