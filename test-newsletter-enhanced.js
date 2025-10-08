const fetch = require('node-fetch');

const API_BASE_URL = process.env.API_BASE_URL;

async function testNewsletterAPI() {
    console.log('🧪 Enhanced Newsletter Subscription API Testing\n');

    // Generate unique email for testing
    const uniqueEmail = `test.${Date.now()}@example.com`;
    const results = [];

    // Test 1: Valid new subscription
    console.log('Test 1: Valid new subscription');
    try {
        const response1 = await fetch(`${API_BASE_URL}/newsletter/subscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: uniqueEmail,
                firstName: 'Test User',
                source: 'website'
            })
        });

        const data1 = await response1.json();
        const success = response1.status === 201 && data1.success;
        results.push({ test: 1, success, status: response1.status });

        console.log(`   Status: ${response1.status} ${success ? '✅' : '❌'}`);
        console.log(`   Response: ${data1.message}`);
        console.log(`   Email: ${uniqueEmail}\n`);
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
        results.push({ test: 1, success: false, error: error.message });
    }

    // Test 2: Duplicate subscription (should fail gracefully)
    console.log('Test 2: Duplicate subscription');
    try {
        const response2 = await fetch(`${API_BASE_URL}/newsletter/subscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: uniqueEmail, // Same email as Test 1
                firstName: 'Test User Again',
                source: 'popup'
            })
        });

        const data2 = await response2.json();
        const success = response2.status === 409; // Expected conflict
        results.push({ test: 2, success, status: response2.status });

        console.log(`   Status: ${response2.status} ${success ? '✅' : '❌'}`);
        console.log(`   Response: ${data2.message}\n`);
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
        results.push({ test: 2, success: false, error: error.message });
    }

    // Test 3: Invalid email format
    console.log('Test 3: Invalid email format');
    try {
        const response3 = await fetch(`${API_BASE_URL}/newsletter/subscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'invalid-email-format',
                firstName: 'Test User',
                source: 'website'
            })
        });

        const data3 = await response3.json();
        const success = response3.status === 400; // Expected validation error
        results.push({ test: 3, success, status: response3.status });

        console.log(`   Status: ${response3.status} ${success ? '✅' : '❌'}`);
        console.log(`   Response: ${data3.message}\n`);
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
        results.push({ test: 3, success: false, error: error.message });
    }

    // Test 4: Missing required fields
    console.log('Test 4: Missing email field');
    try {
        const response4 = await fetch(`${API_BASE_URL}/newsletter/subscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                firstName: 'Test User',
                source: 'website'
                // Missing email field
            })
        });

        const data4 = await response4.json();
        const success = response4.status === 400; // Expected validation error
        results.push({ test: 4, success, status: response4.status });

        console.log(`   Status: ${response4.status} ${success ? '✅' : '❌'}`);
        console.log(`   Response: ${data4.message}\n`);
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
        results.push({ test: 4, success: false, error: error.message });
    }

    // Test 5: Check if analytics endpoint works
    console.log('Test 5: Newsletter analytics endpoint');
    try {
        const response5 = await fetch(`${API_BASE_URL}/newsletter/analytics`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (response5.status === 200) {
            const analytics = await response5.json();
            console.log(`   Status: ${response5.status} ✅`);
            console.log(`   Total subscribers: ${analytics.data?.totalSubscriptions || 'N/A'}`);
            console.log(`   Recent subscriptions: ${analytics.data?.recentSubscriptions || 'N/A'}`);
            console.log(`   Subscriptions by source: ${JSON.stringify(analytics.data?.subscriptionsBySource || [])}`);
        } else {
            console.log(`   Status: ${response5.status} ❌`);
            console.log(`   Analytics endpoint not available`);
        }
    } catch (error) {
        console.log(`   ❌ Analytics Error: ${error.message}`);
    }

    // Summary
    console.log('\n📊 Test Results Summary:');
    console.log('─'.repeat(40));
    const passedTests = results.filter(r => r.success).length;
    const totalTests = results.length;

    results.forEach(result => {
        const status = result.success ? '✅ PASS' : '❌ FAIL';
        const info = result.error ? `(${result.error})` : `(Status: ${result.status})`;
        console.log(`   Test ${result.test}: ${status} ${info}`);
    });

    console.log(`\n🎯 Newsletter API Testing Complete: ${passedTests}/${totalTests} tests passed`);

    if (passedTests === totalTests) {
        console.log('🎉 All tests passed! Newsletter API is working perfectly.');
    } else {
        console.log('⚠️  Some tests failed. Check the results above for details.');
    }
}

testNewsletterAPI().catch(console.error);