// utils/emailService.js
const nodemailer = require('nodemailer');

const sendEmail = async (to, subject, html) => {
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.CONTACT_EMAIL_PASS || process.env.EMAIL_PASS
        },
        tls: {
            rejectUnauthorized: false
        }
    });
    const mailOptions = {
        from: process.env.EMAIL_FROM || `"Medhelm Supplies" <${process.env.EMAIL_USER || 'info@medhelmsupplies.co.ke'}>`,
        to,
        subject,
        html
    };
    await transporter.sendMail(mailOptions);
};

module.exports = { sendEmail };
