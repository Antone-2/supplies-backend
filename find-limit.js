const { initiatePesapalPayment } = require('./src/services/pesapalService');

async function findLimit() {
    const testAmounts = [500, 1000, 2000, 5000, 10000];

    for (const amount of testAmounts) {
        try {
            console.log(`🧪 Testing ${amount} KES...`);

            const result = await initiatePesapalPayment(
                `limit_test_${amount}_${Date.now()}`,
                amount,
                '254700000000',
                'test@example.com',
                `Test payment - ${amount} KES`
            );

            console.log(`✅ ${amount} KES: SUCCESS`);

        } catch (error) {
            console.log(`❌ ${amount} KES: FAILED - ${error.message}`);
            break; // Stop at first failure
        }

        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}

findLimit();