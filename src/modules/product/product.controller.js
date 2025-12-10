import Product from '../../../Database/models/product.model.js';
import Category from '../../../Database/models/category.model.js';
import mongoose from 'mongoose';
import Order from '../../../Database/models/order.model.js';
import Cart from '../../../Database/models/cart.model.js';
import Wishlist from '../../../Database/models/wishlist.model.js';

const getProducts = async (req, res) => {
    try {
        console.log('getProducts called with query:', req.query);
        const { page = 1, limit = 12, category, sortBy = 'name', sortOrder = 'asc', inStock, admin, showAll, includeInactive } = req.query;

        console.log(' Fetching products directly from database');


        let query = {};
        if (admin === 'true' || showAll === 'true' || includeInactive === 'true') {

            query = {};
        } else {

            query = { isActive: true };
        }
        if (category) {

            if (typeof category === 'string') {
                console.log(' Searching for category:', category);


                let categoryDoc = await Category.findOne({
                    name: { $regex: new RegExp(`^${category}$`, 'i') }
                });

                if (categoryDoc) {
                    query.category = categoryDoc._id;
                    console.log(' Found category by name:', categoryDoc.name, 'ID:', categoryDoc._id);
                } else {

                    if (mongoose.Types.ObjectId.isValid(category)) {
                        const categoryById = await Category.findById(category);
                        if (categoryById) {
                            query.category = categoryById._id;
                            console.log(' Found category by ID:', categoryById.name, 'ID:', categoryById._id);
                        } else {
                            console.log(' Category ID not found:', category);

                            return res.json({
                                products: [],
                                page: parseInt(page),
                                limit: parseInt(limit),
                                total: 0,
                                totalPages: 0
                            });
                        }
                    } else {
                        console.log(' Invalid category format:', category);

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


        const [products, total] = await Promise.race([
            Promise.all([
                Product.find(query, {

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
            ]),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Database query timeout')), 3000)
            )
        ]);

        console.log('Products found:', products.length);
        const response = {
            products,
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / parseInt(limit))
        };

        console.log(' Products fetched directly from database');
        res.json(response);
    } catch (err) {
        console.error('Error fetching products:', err);


        if (err.message === 'Database query timeout') {
            console.log('Database timeout, trying simplified query...');
            try {
                // Even simpler fallback - just get basic product info
                const products = await Promise.race([
                    Product.find({ isActive: true })
                        .select('name price image category countInStock rating numReviews isFeatured discount brand')
                        .sort({ createdAt: -1 })
                        .limit(20)
                        .lean(),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Fallback query timeout')), 2000)
                    )
                ]);

                const total = await Promise.race([
                    Product.countDocuments({ isActive: true }),
                    new Promise((resolve) => resolve(0)) // Default to 0 if count fails
                ]);

                const response = {
                    products: products || [],
                    page: 1,
                    limit: 20,
                    total: total || 0,
                    totalPages: Math.ceil((total || 0) / 20)
                };

                console.log(' Fallback query successful, returning', products.length, 'products');
                return res.json(response);
            } catch (fallbackErr) {
                console.error('Fallback query also failed:', fallbackErr);
                // Return empty results instead of error
                return res.json({
                    products: [],
                    page: 1,
                    limit: 20,
                    total: 0,
                    totalPages: 0
                });
            }
        }

        res.status(500).json({
            message: 'Failed to fetch products',
            details: err.message,
            errorType: err.message === 'Database query timeout' ? 'TIMEOUT' : 'DATABASE_ERROR'
        });
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

        // Direct database queries - no Redis caching for maximum reliability
        console.log(' Fetching featured products directly from database');
        console.log('Querying database for featured products...');

        // Optimized query with selected fields only - add timeout protection
        const products = await Promise.race([
            Product.find(
                {
                    $or: [
                        { isFeatured: true },
                        { featured: true }
                    ],
                    isActive: true
                },
                {
                    // Select only essential fields for faster queries
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
                    brand: 1,
                    sku: 1,
                    originalPrice: 1,
                    isActive: 1,
                    createdAt: 1
                }
            )
                .sort({ createdAt: -1 }) // Remove populate for faster queries
                .limit(parseInt(limit))
                .lean(), // Use lean() for faster queries
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Featured products database query timeout')), 2000) // Reduced to 2 seconds
            )
        ]);

        console.log('Featured products found:', products.length);

        // Format products to match the all products format
        const formattedProducts = products.map(product => ({
            id: product._id,
            name: product.name,
            description: product.description,
            price: product.price,
            originalPrice: product.originalPrice,
            category: product.category?.name || product.category,
            brand: product.brand,
            countInStock: product.countInStock,
            image: product.image,
            images: product.images,
            isFeatured: product.isFeatured,
            featured: product.featured,
            discount: product.discount,
            rating: product.rating,
            numReviews: product.numReviews,
            isActive: product.isActive,
            sku: product.sku,
            createdAt: product.createdAt,
            updatedAt: product.updatedAt
        }));

        const response = { products: formattedProducts };

        // Skip Redis caching - return featured products directly from database
        console.log(' Featured products fetched directly from database');

        res.json(response);
    } catch (err) {
        console.error('Error fetching featured products:', err);

        // If it's a timeout error, try a simpler query
        if (err.message === 'Featured products database query timeout') {
            console.log('Featured products timeout, trying simplified query...');
            try {
                const products = await Promise.race([
                    Product.find(
                        { isActive: true, $or: [{ isFeatured: true }, { featured: true }] }
                    )
                        .select('name price image category countInStock rating numReviews isFeatured discount brand')
                        .sort({ createdAt: -1 })
                        .limit(parseInt(limit))
                        .lean(),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Fallback featured products timeout')), 1500)
                    )
                ]);

                console.log(' Fallback featured products query successful, returning', products.length, 'products');

                const response = {
                    products: products.map(product => ({
                        id: product._id,
                        name: product.name,
                        description: product.description,
                        price: product.price,
                        originalPrice: product.originalPrice,
                        category: product.category?.name || product.category,
                        brand: product.brand,
                        countInStock: product.countInStock,
                        image: product.image,
                        images: product.images,
                        isFeatured: product.isFeatured,
                        featured: product.featured,
                        discount: product.discount,
                        rating: product.rating,
                        numReviews: product.numReviews,
                        isActive: product.isActive,
                        sku: product.sku,
                        createdAt: product.createdAt,
                        updatedAt: product.updatedAt
                    }))
                };
                return res.json(response);
            } catch (fallbackErr) {
                console.error('Fallback featured products query also failed:', fallbackErr);

                return res.json({ products: [] });
            }
        }

        res.status(500).json({ message: 'Failed to fetch featured products', details: err.message });
    }
};


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


const createProduct = async (req, res) => {
    try {
        let productData;


        if (req.headers['content-type']?.includes('text/plain')) {

            if (typeof req.body === 'string' && req.body.trim()) {
                try {
                    productData = JSON.parse(req.body);
                } catch (parseError) {
                    console.error('JSON parse error for text/plain:', parseError);
                    console.error('Raw body:', req.body);
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid JSON in text/plain request',
                        error: 'Failed to parse request body as JSON',
                        details: parseError.message
                    });
                }
            } else {

                return res.status(400).json({
                    success: false,
                    message: 'Empty request body',
                    error: 'No data provided in text/plain request'
                });
            }
        } else if (typeof req.body === 'object' && req.body !== null && Object.keys(req.body).length > 0) {

            productData = req.body;
        } else {

            console.error('Unsupported request format:', {
                contentType: req.headers['content-type'],
                bodyType: typeof req.body,
                bodyKeys: typeof req.body === 'object' ? Object.keys(req.body) : 'N/A',
                bodyValue: req.body
            });
            return res.status(400).json({
                success: false,
                message: 'Unsupported request format',
                error: 'Request must be JSON or text/plain with valid JSON content',
                contentType: req.headers['content-type']
            });
        }


        if (!productData.name || !productData.price || !productData.category) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: name, price, category'
            });
        }


        let categoryId = productData.category;
        console.log(' Processing category input:', categoryId, typeof categoryId);

        if (typeof categoryId === 'string') {
            console.log(' Category is string, checking if ObjectId or name...');


            if (mongoose.Types.ObjectId.isValid(categoryId)) {
                console.log(' Valid ObjectId format, looking up by ID...');
                const category = await Category.findById(categoryId);
                if (category) {
                    categoryId = category._id;
                    console.log(' Category found by ID:', category.name);
                } else {
                    console.log(' Category ID not found in database');
                    return res.status(400).json({
                        success: false,
                        message: `Category with ID "${categoryId}" does not exist. Please select a valid category from the dropdown.`
                    });
                }
            } else {

                console.log(' Not a valid ObjectId, trying to find by name...');
                const category = await Category.findOne({
                    name: { $regex: new RegExp(`^${categoryId}$`, 'i') }
                });

                if (category) {
                    categoryId = category._id;
                    console.log(' Category found by name:', category.name);
                } else {
                    console.log(' Category name not found in database');
                    return res.status(400).json({
                        success: false,
                        message: `Category "${categoryId}" does not exist. Please select a valid category from the dropdown.`
                    });
                }
            }
        } else if (categoryId && typeof categoryId === 'object' && categoryId._id) {

            categoryId = categoryId._id;
            console.log(' Category provided as object with _id');
        } else {
            console.log(' Invalid category format provided');
            return res.status(400).json({
                success: false,
                message: 'Category is required. Please select a category from the dropdown.'
            });
        }

        // Handle image processing - ensure images are properly formatted
        let processedImages = [];
        let primaryImage = '';

        console.log(' Processing images for product:', productData.name);
        console.log(' Raw image data:', { image: productData.image, images: productData.images });

        if (productData.images && Array.isArray(productData.images)) {
            // Process images array - handle different formats
            processedImages = productData.images.map((img, index) => {
                console.log(`️ Processing image ${index}:`, img, typeof img);

                if (typeof img === 'string') {
                    // If it's a string, it could be a URL or file path
                    if (img.startsWith('http://') || img.startsWith('https://')) {
                        console.log(` Image ${index} is already a full URL`);
                        return img;
                    } else if (img.startsWith('/uploads/') || img.startsWith('uploads/')) {

                        const baseUrl = 'https://supplies-backend.onrender.com';
                        const fullUrl = img.startsWith('/') ? `${baseUrl}${img}` : `${baseUrl}/${img}`;
                        console.log(` Converted upload path ${index}:`, img, '→', fullUrl);
                        return fullUrl;
                    } else if (img.startsWith('data:')) {

                        console.log(` Image ${index} is base64 data URL`);
                        return img;
                    } else {

                        const baseUrl = 'https://supplies-backend.onrender.com';
                        const fullUrl = `${baseUrl}/${img}`;
                        console.log(` Constructed URL for ${index}:`, img, '→', fullUrl);
                        return fullUrl;
                    }
                } else if (typeof img === 'object' && img !== null) {
                    // Handle object format { url: string, alt?: string }
                    if (img.url) {
                        if (img.url.startsWith('http://') || img.url.startsWith('https://')) {
                            console.log(` Image ${index} object has full URL`);
                            return img.url;
                        } else if (img.url.startsWith('/uploads/') || img.url.startsWith('uploads/')) {
                            const baseUrl = 'https://supplies-backend.onrender.com';
                            const fullUrl = img.url.startsWith('/') ? `${baseUrl}${img.url}` : `${baseUrl}/${img.url}`;
                            console.log(` Converted object upload path ${index}:`, img.url, '→', fullUrl);
                            return fullUrl;
                        } else {
                            const baseUrl = 'https://supplies-backend.onrender.com';
                            const fullUrl = `${baseUrl}/${img.url}`;
                            console.log(` Constructed object URL for ${index}:`, img.url, '→', fullUrl);
                            return fullUrl;
                        }
                    }
                }
            }).filter(img => img !== null);

            console.log(' Processed images array:', processedImages);


        }

        if (processedImages.length > 0) {
            primaryImage = processedImages[0];
            console.log('️ Set primary image from array:', primaryImage);
        }

        if (!primaryImage && productData.image) {
            console.log(' Processing single image field:', productData.image);

            if (productData.image.startsWith('http://') || productData.image.startsWith('https://')) {
                primaryImage = productData.image;
                console.log(' Single image is already full URL');
            } else if (productData.image.startsWith('/uploads/') || productData.image.startsWith('uploads/')) {
                const baseUrl = 'https://supplies-backend.onrender.com';
                primaryImage = productData.image.startsWith('/') ? `${baseUrl}${productData.image}` : `${baseUrl}/${productData.image}`;
                console.log(' Converted single image upload path:', productData.image, '→', primaryImage);
            } else if (productData.image.startsWith('data:')) {
                primaryImage = productData.image;
                console.log(' Single image is base64 data URL');
            } else {
                const baseUrl = 'https://supplies-backend.onrender.com';
                primaryImage = `${baseUrl}/${productData.image}`;
                console.log(' Constructed single image URL:', productData.image, '→', primaryImage);
            }

            // Add to processed images if not already there
            if (primaryImage && !processedImages.includes(primaryImage)) {
                processedImages.unshift(primaryImage);
                console.log(' Added primary image to processed images array');
            }
        }

        // Ensure we have at least a placeholder if no images
        if (!primaryImage) {
            primaryImage = 'https://supplies-backend.onrender.com/uploads/placeholder.jpg';
            processedImages = [primaryImage];
            console.log('️ No images provided, using placeholder');
        }

        console.log(' Final image processing result:', {
            primaryImage,
            imagesCount: processedImages.length,
            images: processedImages
        });

        const product = new Product({
            name: productData.name,
            description: productData.description || '',
            price: Number(productData.price),
            originalPrice: productData.originalPrice ? Number(productData.originalPrice) : undefined,
            category: categoryId,
            brand: productData.brand || undefined,
            countInStock: Number(productData.countInStock) || 0,
            image: primaryImage,
            images: processedImages.map(img => ({ url: img, alt: '' })),
            isFeatured: productData.isFeatured || false,
            featured: productData.featured || false,
            discount: Number(productData.discount) || 0,
            rating: Number(productData.rating) || 0,
            numReviews: Number(productData.numReviews) || 0,
            isActive: true
        });

        await product.save();


        await product.populate('category');


        try {
            const { createAdminNotification } = await import('../../controllers/adminNotificationController.js');
            await createAdminNotification(
                'product_created',
                `New product "${product.name}" has been added to the catalog`,
                'Product Added Successfully',
                'low'
            );
        } catch (notificationError) {
            console.warn('Failed to create admin notification for product creation:', notificationError);

        }

        console.log(' Product created successfully:', {
            id: product._id,
            name: product.name,
            category: product.category?.name || product.category,
            categoryId: product.category?._id || product.category,
            price: product.price,
            countInStock: product.countInStock,
            isActive: product.isActive
        });

        res.status(201).json({
            success: true,
            message: `Product "${product.name}" has been successfully added to your catalog and is now available in the store!`,
            product: {
                _id: product._id,
                name: product.name,
                description: product.description,
                price: product.price,
                originalPrice: product.originalPrice,
                category: product.category,
                brand: product.brand,
                countInStock: product.countInStock,
                image: product.image,
                images: product.images,
                isFeatured: product.isFeatured,
                featured: product.featured,
                discount: product.discount,
                rating: product.rating,
                numReviews: product.numReviews,
                isActive: product.isActive,
                createdAt: product.createdAt,
                updatedAt: product.updatedAt
            },
            notification: {
                type: 'success',
                title: 'Product Added Successfully',
                message: `Product "${product.name}" is now live in your store!`
            }
        });
    } catch (err) {
        console.error('Error creating product:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to create product',
            error: err.message
        });
    }
};


const updateProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const updates = req.body;


        if (updates.category && typeof updates.category === 'string') {
            // First check if it's a valid ObjectId
            if (mongoose.Types.ObjectId.isValid(updates.category)) {
                const category = await Category.findById(updates.category);
                if (category) {
                    updates.category = category._id;
                } else {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid category ID provided'
                    });
                }
            } else {

                const category = await Category.findOne({ name: updates.category });
                if (category) {
                    updates.category = category._id;
                } else {
                    return res.status(400).json({
                        success: false,
                        message: `Category "${updates.category}" does not exist. Please select an existing category from the dropdown.`
                    });
                }
            }
        }


        if (updates.images && Array.isArray(updates.images)) {
            updates.images = updates.images.map(img => {
                if (typeof img === 'string') {
                    return { url: img, alt: '' };
                }
                return img;
            });
        }

        const product = await Product.findByIdAndUpdate(
            productId,
            { ...updates, updatedAt: new Date() },
            { new: true, runValidators: false }
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


const deleteProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        console.log('Permanently deleting product with ID:', productId);


        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }


        const orderCount = await Order.countDocuments({
            'items.productId': productId
        });

        if (orderCount > 0) {
            return res.status(400).json({
                message: `Cannot delete product. It is referenced in ${orderCount} order(s). Consider deactivating instead.`,
                ordersCount: orderCount
            });
        }


        const cartCount = await Cart.countDocuments({
            'items.productId': productId
        });

        if (cartCount > 0) {

            await Cart.updateMany(
                { 'items.productId': productId },
                { $pull: { items: { productId: productId } } }
            );
            console.log(`Removed product from ${cartCount} cart(s)`);
        }


        const wishlistCount = await Wishlist.countDocuments({
            products: productId
        });

        if (wishlistCount > 0) {

            await Wishlist.updateMany(
                { products: productId },
                { $pull: { products: productId } }
            );
            console.log(`Removed product from ${wishlistCount} wishlist(s)`);
        }


        await Product.findByIdAndDelete(productId);

        console.log('Product permanently deleted from database and cleaned up from all references');
        res.json({
            success: true,
            message: 'Product permanently deleted from database and all references cleaned up',
            cleanup: {
                cartsCleaned: cartCount,
                wishlistsCleaned: wishlistCount
            }
        });
    } catch (err) {
        console.error('Error permanently deleting product:', err);
        res.status(500).json({
            message: 'Failed to permanently delete product',
            error: err.message
        });
    }
};


const getAllProducts = async (req, res) => {
    try {
        console.log('getAllProducts called for admin');


        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ message: 'Database connection unavailable. Please try again later.' });
        }



        console.log('getAllProducts called for admin - checking database connection');


        if (mongoose.connection.readyState !== 1) {
            console.log('MongoDB not connected, attempting to connect...');
            return res.status(503).json({ message: 'Database connection unavailable. Please try again later.' });
        }

        const products = await Product.find({})
            .populate('category', 'name')
            .sort({ createdAt: -1 })
            .setOptions({ skipValidation: true })
            .lean();

        console.log('All products found:', products.length);
        console.log('Sample product categories:', products.slice(0, 3).map(p => ({
            name: p.name,
            category: p.category,
            categoryName: p.category?.name
        })));


        const formattedProducts = products.map(product => ({
            id: product._id,
            name: product.name,
            description: product.description,
            price: product.price,
            originalPrice: product.originalPrice,
            category: product.category?.name || product.category,
            brand: product.brand,
            countInStock: product.countInStock,
            inStock: product.countInStock > 0,
            image: product.image,
            images: product.images,
            isFeatured: product.isFeatured,
            featured: product.featured,
            discount: product.discount,
            rating: product.rating,
            numReviews: product.numReviews,
            isActive: product.isActive,
            createdAt: product.createdAt,
            updatedAt: product.updatedAt
        }));

        console.log('Returning formatted products:', formattedProducts.length);

        res.json({
            success: true,
            products: formattedProducts,
            total: formattedProducts.length,
            message: formattedProducts.length > 0 ? 'Products loaded successfully' : 'No products found in database'
        });
    } catch (err) {
        console.error('Error fetching all products:', err);
        console.error('Error details:', err.message);
        console.error('MongoDB connection state:', mongoose.connection.readyState);


        try {
            const db = mongoose.connection.db;
            const productsCollection = db.collection('products');
            const products = await productsCollection.find({}).sort({ createdAt: -1 }).toArray();
            console.log('Raw MongoDB query: All products found:', products.length);
            console.log('Sample raw products:', products.slice(0, 2).map(p => ({ name: p.name, isActive: p.isActive })));

            const formattedProducts = products.map(product => ({
                id: product._id,
                name: product.name,
                description: product.description,
                price: product.price,
                originalPrice: product.originalPrice,
                category: product.category || 'Uncategorized',
                brand: product.brand,
                countInStock: product.countInStock,
                inStock: product.countInStock > 0,
                image: product.image,
                images: product.images,
                isFeatured: product.isFeatured,
                featured: product.featured,
                discount: product.discount,
                rating: product.rating,
                numReviews: product.numReviews,
                isActive: product.isActive,
                createdAt: product.createdAt,
                updatedAt: product.updatedAt
            }));

            res.json({
                success: true,
                products: formattedProducts,
                total: formattedProducts.length
            });
        } catch (rawErr) {
            console.error('Raw MongoDB query also failed:', rawErr);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch all products',
                error: rawErr.message,
                suggestion: 'Check database connection and try again'
            });
        }
    }
};

export { getProducts, createProduct, updateProduct, deleteProduct, getCategoriesWithCounts, getCategories, getProductsByCategory, getFeaturedProducts, getProductById, getAllProducts };