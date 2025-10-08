require('dotenv').config();
const mongoose = require('mongoose');
const orderController = require('./src/modules/order/order.controller');
const testDatabase = require('./testDatabase');

// Mock Express request and response objects
const createMockRequest = (orderId) => ({
    params: { id: orderId }
});

const createMockResponse = () => {
    const res = {};
    res.status = function (code) {
        res.statusCode = code;
        return res;
    };
    res.json = function (data) {
        res.jsonData = data;
        return res;
    };
    return res;
};

async function connectToMongoDB() {
    try {
        console.log('🔌 Attempting to connect to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000, // 5 second timeout
        });
        console.log('✅ MongoDB Connected Successfully!');
        console.log(`   Host: ${mongoose.connection.host}`);
        console.log(`   Database: ${mongoose.connection.name}`);
        return true;
    } catch (error) {
        console.log('❌ MongoDB Connection Failed:');
        console.log(`   Error: ${error.message}`);
        console.log('   Falling back to test database...');
        return false;
    }
}

async function testOrderTracking() {
    console.log('🧪 Testing Order Tracking API with MongoDB Connection...\n');

    // Try to connect to MongoDB
    const mongoConnected = await connectToMongoDB();
    console.log('\n' + '='.repeat(60) + '\n');

    // Test 1: Valid order tracking
    console.log('Test 1: Tracking existing order MH-2025-001');
    const req1 = createMockRequest('MH-2025-001');
    const res1 = createMockResponse();

    try {
        await orderController.getSpecificOrder(req1, res1);

        if (res1.jsonData?.order) {
            const order = res1.jsonData.order;
            console.log('✅ Success! Order found:');
            console.log(`   - Order ID: ${order.orderId}`);
            console.log(`   - Status: ${order.status}`);
            console.log(`   - Customer: ${order.shippingAddress.fullName}`);
            console.log(`   - Total: KSh ${order.totalAmount}`);
            console.log(`   - Timeline Events: ${order.timeline.length}`);
            console.log(`   - Data Source: ${mongoConnected ? 'MongoDB' : 'Test Database'}`);
        } else {
            console.log('❌ Failed: Unexpected response format');
        }
    } catch (error) {
        console.log('❌ Error:', error.message);
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Test 2: Invalid order tracking
    console.log('Test 2: Tracking non-existent order INVALID-123');
    const req2 = createMockRequest('INVALID-123');
    const res2 = createMockResponse();

    try {
        await orderController.getSpecificOrder(req2, res2);

        if (res2.statusCode === 404) {
            console.log('✅ Success! Correctly returned 404 for invalid order');
            console.log(`   - Message: ${res2.jsonData?.message}`);
        } else {
            console.log('❌ Failed: Should return 404 for invalid order');
        }
    } catch (error) {
        console.log('❌ Error:', error.message);
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Test 3: Connection status
    console.log('Test 3: Database Connection Status');
    console.log(`MongoDB Status: ${mongoose.connection.readyState === 1 ? '🟢 Connected' : '🔴 Disconnected'}`);

    if (!mongoConnected) {
        console.log('📊 Test Database Available Orders:');
        const allOrders = await testDatabase.findOrders({});
        allOrders.forEach((order, index) => {
            console.log(`   ${index + 1}. ${order._id} - ${order.shippingAddress.fullName} (${order.orderStatus})`);
        });
    }

    console.log('\n🎉 Order tracking API testing completed!');

    if (mongoConnected) {
        console.log('\n📋 MongoDB Connection Details:');
        console.log(`   - URI: ${process.env.MONGO_URI?.replace(/\/\/.*@/, '//***:***@')}`);
        console.log(`   - Connection State: ${mongoose.connection.readyState}`);
        console.log('   - Ready to use real production data!');
    } else {
        console.log('\n📋 Using Test Database:');
        console.log('   - Sample orders available for testing');
        console.log('   - Check network connection and MongoDB credentials');
        console.log('   - Verify MongoDB Atlas cluster is running');
    }

    // Close MongoDB connection
    if (mongoConnected) {
        await mongoose.connection.close();
        console.log('\n🔌 MongoDB connection closed');
    }
}

// Run the test
testOrderTracking().catch(console.error);