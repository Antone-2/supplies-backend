// Seed script for products
const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

const Product = require('./Database/models/product.model');

const products = [
    {
        name: 'Surgical Face Mask',
        description: 'Disposable 3-ply face mask for medical use',
        price: 500,
        image: 'https://via.placeholder.com/150',
        category: 'Medical Equipment',
        brand: 'MedSafe',
        countInStock: 100,
        rating: 4.5,
        numReviews: 12,
        isFeatured: true,
    },
    {
        name: 'Digital Thermometer',
        description: 'Accurate digital thermometer for home and clinic',
        price: 1200,
        image: 'https://via.placeholder.com/150',
        category: 'Medical Equipment',
        brand: 'ThermoPro',
        countInStock: 50,
        rating: 4.7,
        numReviews: 8,
        isFeatured: false,
    },
    {
        name: 'Blood Pressure Monitor',
        description: 'Automatic upper arm blood pressure monitor',
        price: 3500,
        image: 'https://via.placeholder.com/150',
        category: 'Medical Equipment',
        brand: 'BPCheck',
        countInStock: 30,
        rating: 4.3,
        numReviews: 5,
        isFeatured: false,
    },
    {
        name: 'Hand Sanitizer 500ml',
        description: 'Alcohol-based hand sanitizer gel',
        price: 300,
        image: 'https://via.placeholder.com/150',
        category: 'Personal Care',
        brand: 'CleanHands',
        countInStock: 200,
        rating: 4.8,
        numReviews: 20,
        isFeatured: true,
    },
];

async function seed() {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Connected to MongoDB');
        await Product.deleteMany({});
        await Product.insertMany(products);
        console.log('Seeded products successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Seeding error:', err);
        process.exit(1);
    }
}

seed();
