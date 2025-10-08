const axios = require('axios');

async function seedProductsViaAPI() {
    const baseURL = process.env.API_URL;

    try {
        console.log('Checking server status...');

        // Check if products already exist
        const productsResponse = await axios.get(`${baseURL}/products`);
        const existingProducts = productsResponse.data.products || productsResponse.data.data || [];

        console.log(`Found ${existingProducts.length} existing products`);

        if (existingProducts.length === 0) {
            console.log('No products found. Seeding sample products...');

            let successCount = 0;
            let errorCount = 0;

            for (const product of sampleProducts) {
                try {
                    console.log(`Creating product: ${product.name}`);
                    const response = await axios.post(`${baseURL}/products`, product);
                    console.log(`✓ Created: ${product.name}`);
                    successCount++;
                } catch (error) {
                    console.error(`✗ Failed to create ${product.name}:`, error.response?.data?.message || error.message);
                    errorCount++;
                }
            }

            console.log(`\nSeeding completed:`);
            console.log(`✓ Successful: ${successCount}`);
            console.log(`✗ Failed: ${errorCount}`);

        } else {
            console.log('Products already exist in database. Skipping seeding.');
            console.log('Existing products:');
            existingProducts.slice(0, 5).forEach((product, index) => {
                console.log(`  ${index + 1}. ${product.name} - $${product.price}`);
            });
            if (existingProducts.length > 5) {
                console.log(`  ... and ${existingProducts.length - 5} more`);
            }
        }

    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.error('❌ Server is not running. Please start your server first:');
            console.error('   npm start');
        } else if (error.response?.status === 404) {
            console.error('❌ API endpoint not found. Make sure your server has the correct routes.');
        } else {
            console.error('❌ Error:', error.response?.data?.message || error.message);
        }
    }
}

// Run the seeder
if (require.main === module) {
    seedProductsViaAPI();
}

module.exports = { seedProductsViaAPI, sampleProducts };