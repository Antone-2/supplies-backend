// Quick product seeder for testing
const mongoose = require('mongoose');
const Product = require('./Database/models/product.model');
const Category = require('./Database/models/category.model');
const sampleProducts = require('../Database/adminProducts');
const config = require('./config');

// Use the same connection logic as the main server
const { MONGO_URI } = config;

// Connection function with fallbacks (same as server)
async function connectWithRetry() {
    const mongoURIs = [
        MONGO_URI,
        MONGO_URI.replace('mongodb+srv://', 'mongodb://'), // Fallback to standard MongoDB
        'mongodb://localhost:27017/medhelm' // Local fallback
    ];

    for (let i = 0; i < mongoURIs.length; i++) {
        const uri = mongoURIs[i];
        console.log(`Trying MongoDB URI ${i + 1}...`);

        for (let attempt = 1; attempt <= 2; attempt++) {
            try {
                console.log(`MongoDB connection attempt ${attempt} of 2 for URI ${i + 1}`);

                await mongoose.connect(uri, {
                    serverSelectionTimeoutMS: 5000, // 5 second timeout
                    socketTimeoutMS: 45000,
                    maxPoolSize: 10,
                    bufferCommands: false
                });

                console.log(`Successfully connected to MongoDB using URI ${i + 1}`);
                return true;
            } catch (error) {
                console.log(`MongoDB connection attempt ${attempt} failed for URI ${i + 1}:`, error.message);
                if (attempt < 2) {
                    console.log('Retrying in 3 seconds...');
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            }
        }
    }

    console.error('Failed to connect to MongoDB after trying all URIs and retries');
    return false;
}

async function seedProducts() {
    try {
        // Connect to MongoDB using same logic as server
        const connected = await connectWithRetry();
        if (!connected) {
            throw new Error('Could not connect to any MongoDB instance');
        }

        console.log('Connected to MongoDB');

        // Clear existing products (optional - comment out if you want to keep existing products)
        // await Product.deleteMany({});
        // console.log('Cleared existing products');

        // Check if products already exist
        const existingProducts = await Product.countDocuments();
        console.log('Existing products:', existingProducts);

        // First, ensure categories exist
        const categoriesToCreate = ['Medical Equipment', 'Personal Care'];
        const existingCategories = await Category.find({ name: { $in: categoriesToCreate } });
        const existingCategoryNames = existingCategories.map(cat => cat.name);

        const categoriesToInsert = categoriesToCreate
            .filter(catName => !existingCategoryNames.includes(catName))
            .map(catName => ({ name: catName, description: `${catName} category` }));

        if (categoriesToInsert.length > 0) {
            await Category.insertMany(categoriesToInsert);
            console.log(`Created ${categoriesToInsert.length} categories`);
        }

        // Get category ObjectIds
        const medicalEquipment = await Category.findOne({ name: 'Medical Equipment' });
        const personalCare = await Category.findOne({ name: 'Personal Care' });

        if (existingProducts === 0) {
            // Prepare products with proper category references
            const productsWithCategories = sampleProducts.map(product => ({
                ...product,
                category: product.category === 'Medical Equipment' ? medicalEquipment._id : personalCare._id
            }));

            // Insert sample products
            const insertedProducts = await Product.insertMany(productsWithCategories);
            console.log(`Successfully inserted ${insertedProducts.length} products`);

            // Log featured products
            const featuredCount = insertedProducts.filter(p => p.isFeatured).length;
            console.log(`Featured products created: ${featuredCount}`);
        } else {
            console.log('Products already exist in database');
        }

        // Close connection
        await mongoose.connection.close();
        console.log('Database connection closed');

    } catch (error) {
        console.error('Error seeding products:', error);
        process.exit(1);
    }
}

// Run the seeder if this file is executed directly
if (require.main === module) {
    seedProducts();
}

module.exports = { seedProducts, sampleProducts };