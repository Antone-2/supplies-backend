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

async function testOrderTracking() {
    console.log('🧪 Testing Order Tracking API...\n');

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
        } else {
            console.log('❌ Failed: Unexpected response format');
            console.log('Response:', res1);
        }
    } catch (error) {
        console.log('❌ Error:', error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

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
            console.log('Response:', res2);
        }
    } catch (error) {
        console.log('❌ Error:', error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 3: Test sample order data
    console.log('Test 3: Available sample orders in test database');
    const allOrders = await testDatabase.findOrders({});
    console.log(`✅ Found ${allOrders.length} sample orders:`);

    allOrders.forEach((order, index) => {
        console.log(`   ${index + 1}. ${order._id} - ${order.shippingAddress.fullName} (${order.orderStatus})`);
    });

    console.log('\n🎉 Order tracking API testing completed!');
    console.log('\nTo test in the frontend:');
    console.log('1. Try tracking order ID: MH-2025-001 (John Doe - Shipped)');
    console.log('2. Try tracking order ID: MH-2025-002 (Jane Smith - Processing)');
    console.log('3. Try tracking invalid ID to see error handling');
}

// Run the test
testOrderTracking().catch(console.error);