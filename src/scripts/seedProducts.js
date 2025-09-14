const mongoose = require('mongoose');
const Product = require('../../Database/models/product.model');
require('dotenv').config({ path: '../../.env' });

const sampleProducts = [
    {
        name: 'Digital Thermometer',
        description: 'Accurate and fast digital thermometer for home and clinical use.',
        price: 800,
        image: 'https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b',
        category: 'Diagnostics',
        brand: 'MediCheck',
        countInStock: 50,
        rating: 4.5,
        numReviews: 12,
        isFeatured: true,
        featured: true
    },
    {
        name: 'Surgical Face Mask',
        description: '3-ply disposable face mask for protection against airborne particles.',
        price: 300,
        image: 'https://images.unsplash.com/photo-1588776814546-ec7e8c1b5b8c',
        category: 'Protection',
        brand: 'SafeGuard',
        countInStock: 200,
        rating: 4.7,
        numReviews: 34,
        isFeatured: true,
        featured: true
    },
    {
        name: 'Nitrile Gloves',
        description: 'Powder-free nitrile gloves for medical and general use.',
        price: 1200,
        image: 'https://images.unsplash.com/photo-1588776814546-ec7e8c1b5b8c',
        category: 'Protection',
        brand: 'GlovePro',
        countInStock: 100,
        rating: 4.6,
        numReviews: 20,
        isFeatured: true,
        featured: true
    },
    {
        name: 'Blood Pressure Monitor',
        description: 'Automatic digital blood pressure monitor for easy home use.',
        price: 3500,
        image: 'https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b',
        category: 'Diagnostics',
        brand: 'HealthPlus',
        countInStock: 30,
        rating: 4.8,
        numReviews: 15,
        isFeatured: true,
        featured: true
    }
];

async function seed() {
    await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    await Product.deleteMany({});
    await Product.insertMany(sampleProducts);
    console.log('Sample products seeded!');
    await mongoose.disconnect();
}

seed().catch(err => {
    console.error(err);
    process.exit(1);
});
