// pesapalService.js
const axios = require('axios');

async function initiatePesapalPayment(orderId, amount, phone, email) {
    // Replace with your real Pesapal API integration
    // This is a placeholder for demonstration
    return {
        paymentUrl: `https://pesapal.com/pay?orderId=${orderId}&amount=${amount}`
    };
}

module.exports = { initiatePesapalPayment };