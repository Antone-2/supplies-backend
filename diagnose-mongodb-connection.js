require('dotenv').config();
const mongoose = require('mongoose');

async function testMongoConnection() {
    console.log('🧪 MongoDB Connection Diagnostics\n');

    console.log('📋 Environment Check:');
    console.log(`   MONGO_URI exists: ${process.env.MONGO_URI ? '✅ Yes' : '❌ No'}`);
    console.log(`   URI format: ${process.env.MONGO_URI?.replace(/\/\/.*@/, '//***:***@')}`);

    console.log('\n🔌 Connection Attempts:\n');

    // Test 1: Quick timeout
    console.log('Test 1: Quick connection (5s timeout)');
    try {
        const conn1 = await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
        });
        console.log('✅ SUCCESS: Connected in < 5 seconds');
        console.log(`   Host: ${conn1.connection.host}`);
        console.log(`   DB: ${conn1.connection.name}`);
        await mongoose.connection.close();
        return;
    } catch (error) {
        console.log('❌ FAILED: 5s timeout');
        console.log(`   Error: ${error.message}`);
    }

    // Test 2: Longer timeout
    console.log('\nTest 2: Extended connection (30s timeout)');
    try {
        const conn2 = await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 30000,
        });
        console.log('✅ SUCCESS: Connected with extended timeout');
        console.log(`   Host: ${conn2.connection.host}`);
        console.log(`   DB: ${conn2.connection.name}`);
        await mongoose.connection.close();
    } catch (error) {
        console.log('❌ FAILED: 30s timeout');
        console.log(`   Error: ${error.message}`);

        console.log('\n🔧 Possible Solutions:');
        console.log('   1. Check internet connection');
        console.log('   2. Verify MongoDB Atlas cluster is running');
        console.log('   3. Check IP whitelist in Atlas dashboard');
        console.log('   4. Try connecting from MongoDB Compass');
        console.log('   5. Contact network administrator about firewall rules');
    }
}

testMongoConnection().catch(console.error);