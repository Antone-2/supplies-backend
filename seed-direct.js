// Direct database seeder using server's database connection
const mongoose = require('mongoose');

// Import the Product model
const Product = require('./Database/models/product.model');

async function seedProductsDirectly() {
    try {
        // Check if mongoose is already connected (from the running server)
        if (mongoose.connection.readyState === 1) {
            console.log('Using existing MongoDB connection from server');
        } else {
            console.log('No existing connection found. The server might not be running.');
            console.log('Please make sure your server is running first (npm start)');
            return;
        }

        // Check existing products
        const existingProducts = await Product.countDocuments();
        console.log(`Current products in database: ${existingProducts}`);

        if (existingProducts === 0) {
            console.log('No products found, adding sample products...');

            // Insert sample products
            const insertedProducts = await Product.insertMany(sampleProducts);
            console.log(`✅ Successfully inserted ${insertedProducts.length} products`);

            // Show the inserted products
            insertedProducts.forEach((product, index) => {
                console.log(`${index + 1}. ${product.name} - $${product.price} (ID: ${product._id})`);
            });

        } else {
            console.log('✅ Products already exist in database');

            // Show existing products
            const products = await Product.find().select('name price category').limit(10);
            console.log('Existing products:');
            products.forEach((product, index) => {
                console.log(`${index + 1}. ${product.name} - $${product.price} (${product.category})`);
            });
        }

        console.log('✅ Seeding completed successfully');

    } catch (error) {
        console.error('❌ Error seeding products:', error.message);
        if (error.message.includes('buffering timed out')) {
            console.log('💡 Hint: Make sure your server is running and connected to the database');
        }
    }
}

// Export for use by other modules
module.exports = { seedProductsDirectly, sampleProducts };

// Run directly if this file is executed
if (require.main === module) {
    seedProductsDirectly();
}