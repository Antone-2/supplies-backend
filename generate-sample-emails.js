import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Email template function
const getEmailTemplate = (title, content) => {
    const logoUrl = process.env.LOGO_URL || 'https://medhelmsupplies.co.ke/medhelm-logo.svg';
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
                <p>Contact: info@medhelmsupplies.co.ke | +254 746 020 323</p>
            </div>
        </div>
    </body>
    </html>
    `;
};

// Sample data
const sampleOrderData = {
    email: 'onyangoantone1@gmail.com',
    name: 'John Doe',
    orderId: 'ORD-2025-001',
    items: [
        { name: 'Surgical Gloves (Size M)', quantity: 5, price: 1500 },
        { name: 'Face Masks (N95)', quantity: 10, price: 2000 },
        { name: 'Hand Sanitizer (500ml)', quantity: 3, price: 1200 }
    ],
    totalAmount: 4700,
    shippingAddress: {
        fullName: 'John Doe',
        address: '123 Medical Street, Healthcare District',
        city: 'Nairobi',
        county: 'Nairobi',
        phone: '+254712345678'
    }
};

// Generate sample emails
const generateSampleEmails = () => {
    console.log('📧 Generating sample email HTML files...\n');

    // Create samples directory
    const samplesDir = path.join(__dirname, 'email-samples');
    if (!fs.existsSync(samplesDir)) {
        fs.mkdirSync(samplesDir);
    }

    // 1. Order Confirmation Email
    const orderItemsHtml = sampleOrderData.items.map(item => `
        <div class="order-item">
            <strong>${item.name}</strong><br>
            Quantity: ${item.quantity}<br>
            Price: KES ${item.price.toLocaleString()}
        </div>
    `).join('');

    const orderContent = `
        <h2>Order Confirmation</h2>
        <p>Dear ${sampleOrderData.name},</p>
        <p>Thank you for your order! We've received your order and are preparing it for shipment.</p>

        <h3>Order Details</h3>
        <p><strong>Order ID:</strong> ${sampleOrderData.orderId}</p>
        <p><strong>Total Amount:</strong> KES ${sampleOrderData.totalAmount.toLocaleString()}</p>

        <h3>Items Ordered</h3>
        ${orderItemsHtml}

        <h3>Shipping Address</h3>
        <p>
            ${sampleOrderData.shippingAddress.fullName}<br>
            ${sampleOrderData.shippingAddress.address}<br>
            ${sampleOrderData.shippingAddress.city}, ${sampleOrderData.shippingAddress.county}<br>
            Phone: ${sampleOrderData.shippingAddress.phone}
        </p>

        <p>We'll send you tracking information once your order ships.</p>
        <a href="https://medhelmsupplies.co.ke/orders" class="button">View Order</a>
    `;

    const orderHtml = getEmailTemplate('Order Confirmation', orderContent);
    fs.writeFileSync(path.join(samplesDir, '1-order-confirmation.html'), orderHtml);
    console.log('✅ Order Confirmation Email saved');

    // 2. Payment Confirmation Email
    const paymentContent = `
        <h2>Payment Confirmed!</h2>
        <p>Dear ${sampleOrderData.name},</p>
        <p>Thank you! Your payment has been successfully processed.</p>

        <h3>Payment Details</h3>
        <p><strong>Order ID:</strong> ${sampleOrderData.orderId}</p>
        <p><strong>Amount Paid:</strong> KES ${sampleOrderData.totalAmount.toLocaleString()}</p>
        <p><strong>Payment Method:</strong> Pesapal</p>

        <h3>Tracking Information</h3>
        <p><strong>Tracking Number:</strong> TRK-2025-001</p>
        <p>You can use this tracking number to monitor your order status.</p>

        <p>Your order is now being prepared for shipment. We'll send you another notification when it ships.</p>
        <a href="https://medhelmsupplies.co.ke/orders" class="button">View Order</a>
    `;

    const paymentHtml = getEmailTemplate('Payment Confirmation', paymentContent);
    fs.writeFileSync(path.join(samplesDir, '2-payment-confirmation.html'), paymentHtml);
    console.log('✅ Payment Confirmation Email saved');

    // 3. Shipping Notification Email
    const shippingContent = `
        <h2>Your Order Has Shipped!</h2>
        <p>Dear ${sampleOrderData.name},</p>
        <p>Great news! Your order <strong>${sampleOrderData.orderId}</strong> has been shipped.</p>

        <p><strong>Tracking Number:</strong> TRK-2025-001</p>

        <p>You should receive your order within 2-3 business days.</p>
        <a href="https://medhelmsupplies.co.ke/orders" class="button">Track Order</a>
    `;

    const shippingHtml = getEmailTemplate('Shipping Notification', shippingContent);
    fs.writeFileSync(path.join(samplesDir, '3-shipping-notification.html'), shippingHtml);
    console.log('✅ Shipping Notification Email saved');

    // 4. Order Status Update - Processing
    const processingContent = `
        <h2>Order Status Update</h2>
        <p>Dear ${sampleOrderData.name},</p>
        <p>Your order <strong>${sampleOrderData.orderId}</strong> status has been updated to: <strong>PROCESSING</strong></p>

        <p>Your order is being processed and prepared for shipment.</p>

        <p><strong>Tracking Number:</strong> TRK-2025-001</p>

        <a href="https://medhelmsupplies.co.ke/orders" class="button">Track Order</a>
    `;

    const processingHtml = getEmailTemplate('Order Status Update', processingContent);
    fs.writeFileSync(path.join(samplesDir, '4-status-processing.html'), processingHtml);
    console.log('✅ Processing Status Email saved');

    // 5. Order Status Update - Shipped
    const shippedContent = `
        <h2>Order Status Update</h2>
        <p>Dear ${sampleOrderData.name},</p>
        <p>Your order <strong>${sampleOrderData.orderId}</strong> status has been updated to: <strong>SHIPPED</strong></p>

        <p>Your order has been shipped and is on its way.</p>

        <p><strong>Tracking Number:</strong> TRK-2025-001</p>

        <a href="https://medhelmsupplies.co.ke/orders" class="button">Track Order</a>
    `;

    const shippedHtml = getEmailTemplate('Order Status Update', shippedContent);
    fs.writeFileSync(path.join(samplesDir, '5-status-shipped.html'), shippedHtml);
    console.log('✅ Shipped Status Email saved');

    // 6. Order Status Update - Delivered
    const deliveredContent = `
        <h2>Order Status Update</h2>
        <p>Dear ${sampleOrderData.name},</p>
        <p>Your order <strong>${sampleOrderData.orderId}</strong> status has been updated to: <strong>DELIVERED</strong></p>

        <p>Your order has been successfully delivered. Thank you for shopping with us!</p>

        <a href="https://medhelmsupplies.co.ke/orders" class="button">Track Order</a>
    `;

    const deliveredHtml = getEmailTemplate('Order Status Update', deliveredContent);
    fs.writeFileSync(path.join(samplesDir, '6-status-delivered.html'), deliveredHtml);
    console.log('✅ Delivered Status Email saved');

    // 7. Delivery Confirmation Email
    const deliveryContent = `
        <h2>Your Order Has Been Delivered!</h2>
        <p>Dear ${sampleOrderData.name},</p>
        <p>Great news! Your order <strong>${sampleOrderData.orderId}</strong> has been successfully delivered.</p>

        <p><strong>Delivery Date:</strong> ${new Date().toLocaleDateString()}</p>

        <p>We hope you are satisfied with your purchase. If you have any questions or concerns, please don't hesitate to contact us.</p>

        <h3>Need Help?</h3>
        <p>Contact our customer service team at info@medhelmsupplies.co.ke or +254 746 020 323</p>

        <a href="https://medhelmsupplies.co.ke/products" class="button">Shop Again</a>
    `;

    const deliveryHtml = getEmailTemplate('Delivery Confirmation', deliveryContent);
    fs.writeFileSync(path.join(samplesDir, '7-delivery-confirmation.html'), deliveryHtml);
    console.log('✅ Delivery Confirmation Email saved');

    // 8. Issue Notification Email
    const issueContent = `
        <h2>Important Update About Your Order</h2>
        <p>Dear ${sampleOrderData.name},</p>
        <p>We wanted to inform you about an update regarding your order <strong>${sampleOrderData.orderId}</strong>.</p>

        <h3>Issue Details</h3>
        <p><strong>Type:</strong> Delivery Delay</p>
        <p><strong>Description:</strong> Due to high demand, your order delivery may be delayed by 1-2 days.</p>
        <p><strong>Expected Resolution:</strong> We expect to resolve this by December 22, 2025.</p>

        <p>We apologize for any inconvenience this may cause. Our team is working diligently to resolve this matter.</p>

        <h3>Contact Us</h3>
        <p>If you have any questions, please contact our customer service team:</p>
        <p>Email: info@medhelmsupplies.co.ke</p>
        <p>Phone: +254 746 020 323</p>

        <a href="https://medhelmsupplies.co.ke/orders" class="button">View Order</a>
    `;

    const issueHtml = getEmailTemplate('Order Update', issueContent);
    fs.writeFileSync(path.join(samplesDir, '8-issue-notification.html'), issueHtml);
    console.log('✅ Issue Notification Email saved');

    console.log('\n🎉 All sample emails have been generated!');
    console.log(`📁 Email samples saved in: ${samplesDir}`);
    console.log('\n📧 To view the emails, open the HTML files in a web browser.');
    console.log('\n📋 Sample files generated:');
    console.log('1. 1-order-confirmation.html - Order confirmation');
    console.log('2. 2-payment-confirmation.html - Payment confirmation');
    console.log('3. 3-shipping-notification.html - Shipping notification');
    console.log('4. 4-status-processing.html - Order processing status');
    console.log('5. 5-status-shipped.html - Order shipped status');
    console.log('6. 6-status-delivered.html - Order delivered status');
    console.log('7. 7-delivery-confirmation.html - Delivery confirmation');
    console.log('8. 8-issue-notification.html - Issue/problem notification');
};

// Run the script
generateSampleEmails();