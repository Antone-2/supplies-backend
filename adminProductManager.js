// adminProductManager.js
// Admin utility to load, delete, or update sample products

const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const Product = require('./Database/models/product.model');
const sampleProducts = require('./Database/adminProducts');

async function loadProducts() {
    await Product.deleteMany({});
    await Product.insertMany(sampleProducts);
    console.log('Sample products loaded.');
}

async function deleteAllProducts() {
    await Product.deleteMany({});
    console.log('All products deleted.');
}

async function updateProduct(name, update) {
    const product = await Product.findOneAndUpdate({ name }, update, { new: true });
    if (product) {
        console.log('Product updated:', product);
    } else {
        console.log('Product not found.');
    }
}

async function main() {
    await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    const action = process.argv[2];
    if (action === 'load') {
        await loadProducts();
    } else if (action === 'delete') {
        await deleteAllProducts();
    } else if (action === 'update') {
        const name = process.argv[3];
        const update = JSON.parse(process.argv[4]);
        await updateProduct(name, update);
    } else {
        console.log('Usage: node adminProductManager.js [load|delete|update "Product Name" "{\"price\":999}"]');
    }
    await mongoose.disconnect();
}

main();
