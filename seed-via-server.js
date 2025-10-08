// Alternative seeder that uses the server's existing connection
const axios = require('axios');

async function seedViaAPI() {
    try {
        console.log('Checking if server is running...');

        // First check if server is running
        const healthResponse = await axios.get(`${process.env.API_URL}/health`);
        console.log('Server is running:', healthResponse.data);

        // Check current product count
        let productsResponse;
        try {
            productsResponse = await axios.get(`${process.env.API_URL}/products`);
            console.log(`Current products in database: ${productsResponse.data.products?.length || 0}`);
        } catch (error) {
            console.log('Could not fetch existing products, continuing with seeding...');
        }

        // If no products exist, seed them
        if (!productsResponse || !productsResponse.data.products || productsResponse.data.products.length === 0) {
            console.log('No products found, seeding sample products...');

            // We'll need to create products via admin endpoint or direct database
            // For now, let's just show the products that need to be added
            console.log('Sample products to add:');
            sampleProducts.forEach((product, index) => {
                console.log(`${index + 1}. ${product.name} - $${product.price}`);
            });

            console.log('\nTo add these products, you can either:');
            console.log('1. Use the admin panel in your application');
            console.log('2. Or we need to create an admin API endpoint for bulk product creation');

        } else {
            console.log('Products already exist in database');
        }

    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.error('Server is not running. Please start your server first with: npm start');
        } else {
            console.error('Error:', error.message);
        }
    }
}

// Run the seeder
if (require.main === module) {
    seedViaAPI();
}

module.exports = { seedViaAPI, sampleProducts };