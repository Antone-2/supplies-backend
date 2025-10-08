const axios = require('axios');
require('dotenv').config();

async function testPesaPalCredentials() {
    const PESAPAL_BASE_URL = process.env.PESAPAL_TEST_MODE
        ? (process.env.PESAPAL_SANDBOX_URL)
        : (process.env.PESAPAL_PRODUCTION_URL); const CONSUMER_KEY = process.env.PESAPAL_CONSUMER_KEY;
    const CONSUMER_SECRET = process.env.PESAPAL_CONSUMER_SECRET;

    console.log('🔍 Testing PesaPal Credentials...');
    console.log('Environment:', process.env.PESAPAL_TEST_MODE === 'true' ? 'SANDBOX' : 'PRODUCTION');
    console.log('Base URL:', PESAPAL_BASE_URL);
    console.log('Consumer Key:', CONSUMER_KEY ? `${CONSUMER_KEY.substring(0, 10)}...` : 'MISSING');
    console.log('Consumer Secret:', CONSUMER_SECRET ? `${CONSUMER_SECRET.substring(0, 10)}...` : 'MISSING');
    console.log('');

    if (!CONSUMER_KEY || !CONSUMER_SECRET) {
        console.error('❌ Missing PesaPal credentials in .env file');
        return;
    }

    try {
        console.log('📡 Making authentication request...');

        const response = await axios.post(
            `${PESAPAL_BASE_URL}/Auth/RequestToken`,
            {
                consumer_key: CONSUMER_KEY,
                consumer_secret: CONSUMER_SECRET
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                timeout: 10000
            }
        );

        console.log('✅ Response Status:', response.status);
        console.log('✅ Response Data:', JSON.stringify(response.data, null, 2));

        if (response.data && (response.data.token || response.data.access_token)) {
            console.log('🎉 SUCCESS: PesaPal authentication working!');
        } else {
            console.log('⚠️  Authentication response received but no token found');
        }

    } catch (error) {
        console.log('❌ PesaPal Authentication Failed:');
        console.log('Status:', error.response?.status);
        console.log('Error Data:', JSON.stringify(error.response?.data, null, 2));

        if (error.response?.data?.error?.code === 'invalid_consumer_key_or_secret_provided') {
            console.log('');
            console.log('🔧 SOLUTION NEEDED:');
            console.log('1. Check your PesaPal developer account at https://developer.pesapal.com/');
            console.log('2. Ensure you\'re using the correct environment credentials (sandbox vs live)');
            console.log('3. Verify your app is properly configured and active');
            console.log('4. Generate new API credentials if needed');
        }
    }
}

// Run the test
testPesaPalCredentials();