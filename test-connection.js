const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

const MONGO_URI = process.env.MONGO_URI;

console.log('🔍 Testing MongoDB connection...');
console.log('📍 Connection URI:', MONGO_URI ? 'Found' : 'Not found');

if (!MONGO_URI) {
    console.error('❌ MONGO_URI not found in environment variables');
    process.exit(1);
}

const testConnection = async () => {
    try {
        console.log('⏳ Attempting to connect to MongoDB...');

        await mongoose.connect(MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 10000, // 10 second timeout for testing
            socketTimeoutMS: 45000,
            bufferCommands: false,
            maxPoolSize: 5,
            family: 4
        });

        console.log('✅ Successfully connected to MongoDB!');
        console.log('📊 Connection state:', mongoose.connection.readyState);
        console.log('🏠 Database name:', mongoose.connection.name);
        console.log('🌐 Host:', mongoose.connection.host);

        // Test a simple database operation
        const db = mongoose.connection.db;
        const collections = await db.collections();
        console.log('📁 Available collections:', collections.map(c => c.collectionName));

        await mongoose.disconnect();
        console.log('👋 Disconnected from MongoDB');
        process.exit(0);

    } catch (error) {
        console.error('❌ Connection test failed:', error.message);
        console.error('🔍 Error details:', {
            name: error.name,
            code: error.code,
            codeName: error.codeName
        });

        // Provide troubleshooting suggestions
        console.log('\n🔧 Troubleshooting suggestions:');
        console.log('1. Check your internet connection');
        console.log('2. Verify MongoDB Atlas cluster is not paused');
        console.log('3. Ensure your IP address is whitelisted in MongoDB Atlas');
        console.log('4. Check if your firewall is blocking the connection');
        console.log('5. Try using a different network (VPN, mobile hotspot)');
        console.log('6. Verify the connection string in your .env file');

        process.exit(1);
    }
};

testConnection();
