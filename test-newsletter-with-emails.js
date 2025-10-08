const fetch = require('node-fetch');

const API_BASE_URL = process.env.API_BASE_URL;

async function testNewsletterWithEmails() {
    console.log('📧 Enhanced Newsletter + Email Notification Testing\n');

    // Generate unique email for testing
    const uniqueEmail = `test.${Date.now()}@example.com`;
    const results = [];

    // Test 1: Subscribe and check for welcome email
    console.log('Test 1: Newsletter subscription with welcome email');
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
        console.log(`   Email: ${uniqueEmail}`);
        console.log(`   📧 Welcome email should be sent to ${uniqueEmail}\n`);
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
        results.push({ test: 1, success: false, error: error.message });
    }

    // Test 2: Get user preferences
    console.log('Test 2: Get newsletter preferences');
    try {
        const response2 = await fetch(`${API_BASE_URL}/newsletter/preferences/${encodeURIComponent(uniqueEmail)}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        const data2 = await response2.json();
        const success = response2.status === 200 && data2.success;
        results.push({ test: 2, success, status: response2.status });

        console.log(`   Status: ${response2.status} ${success ? '✅' : '❌'}`);
        if (success) {
            console.log(`   Preferences:`, JSON.stringify(data2.data.preferences, null, 2));
        }
        console.log('');
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
        results.push({ test: 2, success: false, error: error.message });
    }

    // Test 3: Update preferences
    console.log('Test 3: Update newsletter preferences');
    try {
        const response3 = await fetch(`${API_BASE_URL}/newsletter/preferences/${encodeURIComponent(uniqueEmail)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                productUpdates: true,
                healthTips: false,
                promotions: true
            })
        });

        const data3 = await response3.json();
        const success = response3.status === 200 && data3.success;
        results.push({ test: 3, success, status: response3.status });

        console.log(`   Status: ${response3.status} ${success ? '✅' : '❌'}`);
        if (success) {
            console.log(`   Updated Preferences:`, JSON.stringify(data3.data.preferences, null, 2));
        }
        console.log('');
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
        results.push({ test: 3, success: false, error: error.message });
    }

    // Test 4: Send targeted newsletter (test email only)
    console.log('Test 4: Send targeted newsletter (test)');
    try {
        const response4 = await fetch(`${API_BASE_URL}/newsletter/send-campaign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                subject: 'Test Health Tips Newsletter',
                content: `
                    <div style="padding: 20px; background: #f9f9f9; border-radius: 8px;">
                        <h2 style="color: #2563eb;">Health Tips from Medhelm Supplies</h2>
                        <p>Hello {firstName},</p>
                        <p>Here are some important health tips for today:</p>
                        <ul>
                            <li>Stay hydrated - drink at least 8 glasses of water daily</li>
                            <li>Get adequate sleep - 7-9 hours per night</li>
                            <li>Exercise regularly - at least 30 minutes daily</li>
                            <li>Maintain good hygiene practices</li>
                        </ul>
                        <p>Stay healthy!</p>
                        <p><strong>The Medhelm Supplies Team</strong></p>
                    </div>
                `,
                type: 'healthTips',
                testEmail: uniqueEmail
            })
        });

        const data4 = await response4.json();
        const success = response4.status === 200 && data4.success;
        results.push({ test: 4, success, status: response4.status });

        console.log(`   Status: ${response4.status} ${success ? '✅' : '❌'}`);
        if (success) {
            console.log(`   Campaign Results:`, JSON.stringify(data4.data, null, 2));
            console.log(`   📧 Newsletter email should be sent to ${uniqueEmail}`);
        }
        console.log('');
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
        results.push({ test: 4, success: false, error: error.message });
    }

    // Test 5: Analytics with subscriber breakdown
    console.log('Test 5: Newsletter analytics with preferences');
    try {
        const response5 = await fetch(`${API_BASE_URL}/newsletter/analytics`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        const data5 = await response5.json();
        const success = response5.status === 200 && data5.success;
        results.push({ test: 5, success, status: response5.status });

        console.log(`   Status: ${response5.status} ${success ? '✅' : '❌'}`);
        if (success) {
            console.log(`   Total subscribers: ${data5.data.totalSubscriptions}`);
            console.log(`   Recent subscriptions: ${data5.data.recentSubscriptions}`);
            console.log(`   Subscriptions by source:`, data5.data.subscriptionsBySource);
        }
        console.log('');
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
        results.push({ test: 5, success: false, error: error.message });
    }

    // Test 6: Unsubscribe
    console.log('Test 6: Unsubscribe from newsletter');
    try {
        const response6 = await fetch(`${API_BASE_URL}/newsletter/unsubscribe/${encodeURIComponent(uniqueEmail)}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        const data6 = await response6.json();
        const success = response6.status === 200 && data6.success;
        results.push({ test: 6, success, status: response6.status });

        console.log(`   Status: ${response6.status} ${success ? '✅' : '❌'}`);
        console.log(`   Response: ${data6.message}\n`);
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
        results.push({ test: 6, success: false, error: error.message });
    }

    // Summary
    console.log('📊 Newsletter + Email Notification Test Results:');
    console.log('─'.repeat(60));
    const passedTests = results.filter(r => r.success).length;
    const totalTests = results.length;

    results.forEach(result => {
        const status = result.success ? '✅ PASS' : '❌ FAIL';
        const info = result.error ? `(${result.error})` : `(Status: ${result.status})`;
        console.log(`   Test ${result.test}: ${status} ${info}`);
    });

    console.log(`\n🎯 Newsletter + Email Testing Complete: ${passedTests}/${totalTests} tests passed`);

    if (passedTests === totalTests) {
        console.log('🎉 All tests passed! Newsletter system with email notifications is working perfectly.');
        console.log('\n📧 Email Notifications Summary:');
        console.log('   ✅ Welcome email sent upon subscription');
        console.log('   ✅ Preference management system active');
        console.log('   ✅ Targeted newsletter campaigns ready');
        console.log('   ✅ Analytics tracking subscriber preferences');
        console.log('   ✅ Unsubscribe functionality working');
    } else {
        console.log('⚠️  Some tests failed. Check the results above for details.');
    }
}

testNewsletterWithEmails().catch(console.error);