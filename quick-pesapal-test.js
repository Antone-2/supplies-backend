// Simple PesaPal Debug
require('dotenv').config();

async function quickTest() {
    console.log('Environment check:');
    console.log('PESAPAL_CONSUMER_KEY:', process.env.PESAPAL_CONSUMER_KEY ? 'SET' : 'MISSING');
    console.log('PESAPAL_CONSUMER_SECRET:', process.env.PESAPAL_CONSUMER_SECRET ? 'SET' : 'MISSING');
    console.log('PESAPAL_TEST_MODE:', process.env.PESAPAL_TEST_MODE);

    try {
        const { getAccessToken } = require('./src/services/pesapalService');
        console.log('Attempting to get access token...');
        const token = await getAccessToken();
        console.log('SUCCESS: Token obtained');
        console.log('Token preview:', token.substring(0, 20) + '...');
    } catch (error) {
        console.error('FAILED to get access token:');
        console.error('Error message:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

quickTest();