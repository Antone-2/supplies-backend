// Enhanced email service with Brevo (Sendinblue) and fallback options
const SibApiV3Sdk = require('sib-api-v3-sdk');
const nodemailer = require('nodemailer');

// Brevo setup
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

// Nodemailer fallback setup
const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT || 587,
        secure: false, // Use STARTTLS
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        tls: {
            // Don't fail on invalid certificates (for development)
            rejectUnauthorized: false
        },
        debug: process.env.NODE_ENV, // Enable debug in development
        logger: process.env.NODE_ENV  // Enable logging in development
    });
};

// Base email template
const getEmailTemplate = (title, content) => {
    const logoUrl = process.env.LOGO_URL;
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; background: #2c5aa0; color: white; padding: 30px; border-radius: 8px 8px 0 0; }
            .logo { height: 60px; margin-bottom: 10px; }
            .content { background: #f9f9f9; padding: 30px; }
            .footer { background: #333; color: white; text-align: center; padding: 20px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #2c5aa0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 10px 0; }
            .order-item { border-bottom: 1px solid #ddd; padding: 10px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="${logoUrl}" alt="Medhelm Supplies" class="logo" />
                <h1>Medhelm Supplies</h1>
            </div>
            <div class="content">
                ${content}
            </div>
            <div class="footer">
                <p>&copy; 2025 Medhelm Supplies. All rights reserved.</p>
                <p>Contact: ${process.env.COMPANY_EMAIL} | ${process.env.COMPANY_PHONE}</p>
            </div>
        </div>
    </body>
    </html>
    `;
};

// Send email with Brevo, fallback to Nodemailer
const sendEmail = async (toEmail, subject, htmlContent) => {
    try {
        // Try Brevo first - only if API key is valid (not placeholder)
        if (process.env.BREVO_API_KEY &&
            process.env.BREVO_API_KEY &&
            !process.env.BREVO_API_KEY.includes('xyz')) {
            console.log('🔑 Attempting Brevo API with key:', process.env.BREVO_API_KEY.substring(0, 20) + '...');
            const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
            const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
            sendSmtpEmail.subject = subject;
            sendSmtpEmail.htmlContent = htmlContent;
            sendSmtpEmail.sender = { name: process.env.COMPANY_NAME || 'Medhelm Supplies', email: process.env.EMAIL_FROM };
            sendSmtpEmail.to = [{ email: toEmail }];
            console.log('📧 Sending email via Brevo API to:', toEmail);
            await apiInstance.sendTransacEmail(sendSmtpEmail);
            console.log('✅ Brevo email sent successfully!');
            return { success: true, provider: 'brevo' };
        } else {
            console.log('⚠️ Brevo API key not configured or invalid');
        }
    } catch (error) {
        console.error('❌ Brevo email failed:', error.message, error.response?.body);
    }

    // Try SMTP/Nodemailer (if configured)
    if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        try {
            console.log('📧 Attempting to send email via SMTP...');
            const transporter = createTransporter();

            const mailOptions = {
                from: `"Medhelm Supplies" <${process.env.EMAIL_FROM}>`,
                to: toEmail,
                subject,
                html: htmlContent
            };

            const result = await transporter.sendMail(mailOptions);
            console.log('✅ Email sent successfully via SMTP:', result.messageId);
            return { success: true, provider: 'nodemailer', messageId: result.messageId };

        } catch (error) {
            console.error('❌ SMTP email failed:', error.message);
            // Continue to development fallback
        }
    }

    // Development fallback - just log the email
    if (process.env.NODE_ENV === 'development') {
        console.log('📧 EMAIL (Development Mode):');
        console.log(`To: ${toEmail}`);
        console.log(`Subject: ${subject}`);
        console.log(`Content: ${htmlContent.substring(0, 200)}...`);
        return { success: true, provider: 'development-log' };
    }

    return { success: false, error: 'No email providers configured' };
};

// Order confirmation email
const sendOrderConfirmation = async (orderData) => {
    const { email, name, orderId, items, totalAmount, shippingAddress } = orderData;

    const itemsHtml = items.map(item => `
        <div class="order-item">
            <strong>${item.name}</strong><br>
            Quantity: ${item.quantity}<br>
            Price: KES ${item.price.toLocaleString()}
        </div>
    `).join('');

    const content = `
        <h2>Order Confirmation</h2>
        <p>Dear ${name},</p>
        <p>Thank you for your order! We've received your order and are preparing it for shipment.</p>
        
        <h3>Order Details</h3>
        <p><strong>Order ID:</strong> ${orderId}</p>
        <p><strong>Total Amount:</strong> KES ${totalAmount.toLocaleString()}</p>
        
        <h3>Items Ordered</h3>
        ${itemsHtml}
        
        <h3>Shipping Address</h3>
        <p>
            ${shippingAddress.fullName}<br>
            ${shippingAddress.address}<br>
            ${shippingAddress.city}, ${shippingAddress.county}<br>
            Phone: ${shippingAddress.phone}
        </p>
        
        <p>We'll send you tracking information once your order ships.</p>
        <a href="${process.env.FRONTEND_URL}/orders" class="button">View Order</a>
    `;

    const html = getEmailTemplate('Order Confirmation', content);
    return await sendEmail(email, `Order Confirmation - ${orderId}`, html);
};

// Shipping notification
const sendShippingNotification = async (orderData) => {
    const { email, name, orderId, trackingNumber } = orderData;

    const content = `
        <h2>Your Order Has Shipped!</h2>
        <p>Dear ${name},</p>
        <p>Great news! Your order <strong>${orderId}</strong> has been shipped.</p>
        
        ${trackingNumber ? `<p><strong>Tracking Number:</strong> ${trackingNumber}</p>` : ''}
        
        <p>You should receive your order within 2-3 business days.</p>
        <a href="${process.env.FRONTEND_URL}/orders" class="button">Track Order</a>
    `;

    const html = getEmailTemplate('Shipping Notification', content);
    return await sendEmail(email, `Your Order Has Shipped - ${orderId}`, html);
};

// Legacy function for backward compatibility
const sendOrderEmail = async (toEmail, subject, htmlContent) => {
    const result = await sendEmail(toEmail, subject, htmlContent);
    return result.success;
};

module.exports = {
    sendEmail,
    sendOrderEmail,
    sendOrderConfirmation,
    sendShippingNotification,
    getEmailTemplate
};
