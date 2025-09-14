// payment.controller.cjs
// Express payment controller template for MPESA, Pesapal, and PayPal (CommonJS)

const axios = require('axios');

exports.createPesapalPayment = async (req, res) => {
    try {
        const { orderId, amount, phone, email } = req.body;
        const paymentUrl = `https://pesapal.com/pay?orderId=${orderId}&amount=${amount}`;
        res.json({ paymentUrl });
    } catch (err) {
        res.status(500).json({ message: 'Failed to initiate Pesapal payment' });
    }
};

exports.payWithMpesa = async (req, res) => {
    try {
        const { phone, pin, amount, orderId } = req.body;
        res.json({ message: 'MPESA payment successful', orderId });
    } catch (err) {
        res.status(500).json({ message: 'MPESA payment failed' });
    }
};

exports.payWithAirtel = async (req, res) => {
    try {
        const { phone, pin, amount, orderId } = req.body;
        res.json({ message: 'Airtel Money payment successful', orderId });
    } catch (err) {
        res.status(500).json({ message: 'Airtel Money payment failed' });
    }
};

exports.payWithPaypal = async (req, res) => {
    try {
        const { orderId, amount, email } = req.body;
        res.json({ message: 'PayPal payment successful', orderId });
    } catch (err) {
        res.status(500).json({ message: 'PayPal payment failed' });
    }
};

exports.paymentCallback = async (req, res) => {
    try {
        res.json({ message: 'Payment callback received' });
    } catch (err) {
        res.status(500).json({ message: 'Payment callback failed' });
    }
};