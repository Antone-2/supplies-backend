const axios = require('axios');

const sendSMS = async (to, message) => {
    if (!process.env.BREVO_SMS_API_KEY) throw new Error('BREVO_SMS_API_KEY not set');
    if (!to) throw new Error('Recipient phone number required');

    const payload = {
        sender: 'Medhelm Supplies',
        recipient: to,
        content: message,
        type: 'transactional',
    };

    try {
        await axios.post('https://api.brevo.com/v3/transactionalSMS/sms', payload, {
            headers: {
                'api-key': process.env.BREVO_SMS_API_KEY,
                'Content-Type': 'application/json',
            },
        });
        return true;
    } catch (err) {
        console.error('Failed to send SMS:', err.response?.data || err.message);
        return false;
    }
};

module.exports = { sendSMS };
