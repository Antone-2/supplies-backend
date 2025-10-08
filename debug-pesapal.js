// Debug PesaPal Response
require('dotenv').config();
const axios = require('axios');

async function debugPesapal() {
    const PESAPAL_BASE_URL = process.env.PESAPAL_SANDBOX_URL?.replace('/api', '');
    const CONSUMER_KEY = process.env.PESAPAL_CONSUMER_KEY;
    const CONSUMER_SECRET = process.env.PESAPAL_CONSUMER_SECRET;

    // Validate required environment variables
    if (!PESAPAL_BASE_URL) {
        console.error('❌ ERROR: PESAPAL_SANDBOX_URL is not set in .env file');
        process.exit(1);
    }

    if (!CONSUMER_KEY) {
        console.error('❌ ERROR: PESAPAL_CONSUMER_KEY is not set in .env file');
        process.exit(1);
    }

    if (!CONSUMER_SECRET) {
        console.error('❌ ERROR: PESAPAL_CONSUMER_SECRET is not set in .env file');
        process.exit(1);
    }

    console.log('Testing PesaPal with:');
    console.log('URL:', PESAPAL_BASE_URL + '/Auth/RequestToken');
    console.log('Consumer Key:', CONSUMER_KEY);
    console.log('Consumer Secret:', CONSUMER_SECRET ? 'SET' : 'MISSING');

    try {
        const response = await axios.post(
            `${PESAPAL_BASE_URL}/Auth/RequestToken`,
            {},
            {
                auth: {
                    username: CONSUMER_KEY,
                    password: CONSUMER_SECRET
                },
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                timeout: 10000
            }
        );

        console.log('SUCCESS Response:');
        console.log('Status:', response.status);
        console.log('Headers:', response.headers);
        console.log('Data:', JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.log('ERROR Response:');
        console.log('Status:', error.response?.status);
        console.log('Headers:', error.response?.headers);
        console.log('Data:', JSON.stringify(error.response?.data, null, 2));
        console.log('Error message:', error.message);
    }
}

debugPesapal();