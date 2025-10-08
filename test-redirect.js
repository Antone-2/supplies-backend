// Test PesaPal redirect functionality with a small amount

const { initiatePesapalPayment } = require('./src/services/pesapalService');

async function testRedirect() {
    try {
        console.log('🧪 Testing PesaPal redirect with 500 KES...');

        const result = await initiatePesapalPayment(
            `redirect_test_${Date.now()}`,
            500, // Small amount that should work
            '254700000000',
            'test@example.com',
            'Test payment - Redirect functionality'
        );

        console.log('✅ Payment URL received:');
        console.log('📍 Redirect URL:', result.paymentUrl);
        console.log('🆔 Tracking ID:', result.orderTrackingId);

        if (result.paymentUrl) {
            console.log('\n🎉 SUCCESS: PesaPal redirect should work!');
            console.log('💡 Try this URL in your browser to see PesaPal payment page:');
            console.log(result.paymentUrl);
        } else {
            console.log('❌ No redirect URL received');
        }

    } catch (error) {
        console.log('❌ Redirect test failed:', error.message);
    }
}

testRedirect();