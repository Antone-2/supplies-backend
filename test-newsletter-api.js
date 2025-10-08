const axios = require('axios');

const API_BASE = process.env.API_BASE_URL;

async function testNewsletterSubscription() {
    console.log('🧪 Testing Newsletter Subscription API\n');

    // Generate a unique email for testing
    const uniqueEmail = `test.${Date.now()}@example.com`;

    // Test 1: Valid subscription with unique email
    console.log('Test 1: Valid subscription (new user)');
    try {
        const response1 = await fetch(`${API_BASE_URL}/newsletter/subscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: uniqueEmail,
                firstName: 'Test User',
                source: 'api-test'
            })
        });

        const data1 = await response1.json();
        console.log(`   Status: ${response1.status} ${response1.status === 201 ? '✅' : '❌'}`);
        console.log(`   Response: ${data1.message || JSON.stringify(data1)}`);
        console.log(`   Success: ${data1.success}`);
        console.log(`   Email: ${uniqueEmail}\n`);
    } catch (error) {
        console.log(`   Error: ${error.message}\n`);
    }

    const testCases = [
        {
            name: 'Valid subscription',
            data: {
                email: 'test@example.com',
                firstName: 'Test',
                source: 'test'
            },
            expectedStatus: 201
        },
        {
            name: 'Duplicate subscription',
            data: {
                email: 'test@example.com',
                firstName: 'Test',
                source: 'test'
            },
            expectedStatus: 409
        },
        {
            name: 'Invalid email format',
            data: {
                email: 'invalid-email',
                firstName: 'Test',
                source: 'test'
            },
            expectedStatus: 400
        },
        {
            name: 'Missing email',
            data: {
                firstName: 'Test',
                source: 'test'
            },
            expectedStatus: 400
        }
    ];

    for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        console.log(`Test ${i + 1}: ${testCase.name}`);

        try {
            const response = await axios.post(`${API_BASE}/newsletter/subscribe`, testCase.data, {
                headers: { 'Content-Type': 'application/json' },
                validateStatus: () => true // Don't throw on error status
            });

            const success = response.status === testCase.expectedStatus;
            console.log(`   Status: ${response.status} ${success ? '✅' : '❌'}`);
            console.log(`   Response: ${response.data.message || response.data.error || 'No message'}`);

            if (response.data.success !== undefined) {
                console.log(`   Success: ${response.data.success}`);
            }
        } catch (error) {
            console.log(`   ❌ Request failed: ${error.message}`);
        }

        console.log('');
    }

    console.log('🎯 Newsletter API testing completed!');
}

// Run tests
testNewsletterSubscription().catch(console.error);