const mongoose = require('mongoose');
const Product = require('./Database/models/product.model');
const Category = require('./Database/models/category.model');
const sampleProducts = require('./sampleProducts');
const config = require('./config');


const { MONGO_URI } = config;


async function connectWithRetry() {
    const mongoURIs = [
        MONGO_URI,
        MONGO_URI.replace('mongodb+srv://', 'mongodb://'), // Fallback to standard MongoDB
        'mongodb://localhost:27017/Medhelm' // Local fallback
    ];

    for (let i = 0; i < mongoURIs.length; i++) {
        const uri = mongoURIs[i];
        console.log(`Trying MongoDB URI ${i + 1}...`);

        for (let attempt = 1; attempt <= 2; attempt++) {
            try {
                console.log(`MongoDB connection attempt ${attempt} of 2 for URI ${i + 1}`);

                await mongoose.connect(uri, {
                    serverSelectionTimeoutMS: 5000,
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

        const connected = await connectWithRetry();
        if (!connected) {
            throw new Error('Could not connect to any MongoDB instance');
        }

        console.log('Connected to MongoDB');






        const existingProducts = await Product.countDocuments();
        console.log('Existing products:', existingProducts);


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


        const medicalEquipment = await Category.findOne({ name: 'Medical Equipment' });
        const personalCare = await Category.findOne({ name: 'Personal Care' });

        if (existingProducts === 0) {

            const productsWithCategories = sampleProducts.map(product => ({
                ...product,
                category: product.category === 'Medical Equipment' ? medicalEquipment._id : personalCare._id
            }));


            const insertedProducts = await Product.insertMany(productsWithCategories);
            console.log(`Successfully inserted ${insertedProducts.length} products`);


            const featuredCount = insertedProducts.filter(p => p.isFeatured).length;
            console.log(`Featured products created: ${featuredCount}`);
        } else {
            console.log('Products already exist in database');
        }


        await mongoose.connection.close();
        console.log('Database connection closed');

    } catch (error) {
        console.error('Error seeding products:', error);
        process.exit(1);
    }
}


if (require.main === module) {
    seedProducts();
}

module.exports = { seedProducts, sampleProducts };