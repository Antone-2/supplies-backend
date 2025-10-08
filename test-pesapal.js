// Debug PesaPal connection
require('dotenv').config();
const { initiatePesapalPayment, getAccessToken } = require('./src/services/pesapalService');

async function testPesaPal() {
    try {
        console.log('🧪 Testing PesaPal Configuration...');
        console.log('PESAPAL_TEST_MODE:', process.env.PESAPAL_TEST_MODE);
        console.log('PESAPAL_CONSUMER_KEY:', process.env.PESAPAL_CONSUMER_KEY ? 'SET' : 'NOT SET');
        console.log('PESAPAL_CONSUMER_SECRET:', process.env.PESAPAL_CONSUMER_SECRET ? 'SET' : 'NOT SET');

        console.log('\n🔑 Testing Access Token...');
        const token = await getAccessToken();
        console.log('✅ Access Token obtained successfully');
        console.log('Token length:', token ? token.length : 'null');

        console.log('\n💳 Testing Payment Initiation...');
        const firstResult = await initiatePesapalPayment(
            'test_order_123',
            100,
            '+254712345678',
            'test@example.com',
            'Test Payment'
        );

        console.log('\n📋 Test Order Details:', testOrder);

        const result = await initiatePesapalPayment(
            testOrder.orderId,
            testOrder.amount,
            testOrder.phone,
            testOrder.email,
            testOrder.description
        );

        console.log('\n✅ PesaPal Payment Initiation Successful!');
        console.log('📝 Result:', result);
        console.log('🔗 Payment URL:', result.paymentUrl);
        console.log('🔍 Order Tracking ID:', result.orderTrackingId);

    } catch (error) {
        console.error('\n❌ PesaPal Payment Integration Test Failed:');
        console.error('Error:', error.message);
        console.error('Full Error:', error);
    }
}

// Run the test
testPesapalPayment();