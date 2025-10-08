const { initiatePesapalPayment } = require('./src/services/pesapalService');

async function testSmallPayment() {
    try {
        console.log('🧪 Testing PesaPal with small amount (100 KES)...');

        const result = await initiatePesapalPayment(
            `test_${Date.now()}`, // orderId
            100, // amount in KES (small amount to test limits)
            '254700000000', // phone
            'test@example.com', // email
            'Test payment - Small amount'
        );

        console.log('✅ Small payment test successful:', {
            paymentUrl: result.paymentUrl ? 'URL received' : 'No URL',
            orderTrackingId: result.orderTrackingId || 'undefined',
            hasRedirectUrl: !!result.paymentUrl
        });

    } catch (error) {
        console.log('❌ Small payment test failed:', error.message);

        // Try even smaller amount
        try {
            console.log('🧪 Testing with minimal amount (10 KES)...');

            const result = await initiatePesapalPayment(
                `test_min_${Date.now()}`,
                10, // 10 KES
                '254700000000',
                'test@example.com',
                'Test payment - Minimal amount'
            );

            console.log('✅ Minimal payment test successful:', {
                paymentUrl: result.paymentUrl ? 'URL received' : 'No URL',
                orderTrackingId: result.orderTrackingId || 'undefined'
            });

        } catch (minError) {
            console.log('❌ Minimal payment also failed:', minError.message);
        }
    }
}

testSmallPayment();