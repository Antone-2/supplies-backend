import dotenv from 'dotenv/config.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Sample data for testing
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

const samplePaymentData = {
    ...sampleOrderData,
    paymentMethod: 'Pesapal',
    transactionId: 'TXN-123456789',
    trackingNumber: 'TRK-2025-001'
};

const sampleShippingData = {
    email: 'onyangoantone1@gmail.com',
    name: 'John Doe',
    orderId: 'ORD-2025-001',
    trackingNumber: 'TRK-2025-001'
};

const sampleDeliveryData = {
    email: 'onyangoantone1@gmail.com',
    name: 'John Doe',
    orderId: 'ORD-2025-001',
    deliveryDate: new Date().toISOString()
};

const sampleStatusUpdateData = {
    email: 'onyangoantone1@gmail.com',
    name: 'John Doe',
    orderId: 'ORD-2025-001',
    status: 'processing',
    trackingNumber: 'TRK-2025-001',
    note: 'Your order is being prepared by our warehouse team.'
};

const sampleIssueData = {
    email: 'onyangoantone1@gmail.com',
    name: 'John Doe',
    orderId: 'ORD-2025-001',
    issueType: 'Delivery Delay',
    description: 'Due to high demand, your order delivery may be delayed by 1-2 days.',
    expectedResolution: 'We expect to resolve this by December 22, 2025.'
};

// Send all sample emails
const sendSampleEmails = async () => {
    try {
        console.log('🚀 Starting to send sample emails...\n');

        // 1. Order Confirmation Email
        console.log('📧 Sending Order Confirmation Email...');
        const orderResult = await sendOrderConfirmation(sampleOrderData);
        console.log('✅ Order Confirmation Email sent:', orderResult.success ? 'SUCCESS' : 'FAILED');
        console.log('');

        // 2. Payment Confirmation Email
        console.log('💳 Sending Payment Confirmation Email...');
        const paymentResult = await sendPaymentConfirmation(samplePaymentData);
        console.log('✅ Payment Confirmation Email sent:', paymentResult.success ? 'SUCCESS' : 'FAILED');
        console.log('');

        // 3. Shipping Notification Email
        console.log('🚚 Sending Shipping Notification Email...');
        const shippingResult = await sendShippingNotification(sampleShippingData);
        console.log('✅ Shipping Notification Email sent:', shippingResult.success ? 'SUCCESS' : 'FAILED');
        console.log('');

        // 4. Order Status Update Email (Processing)
        console.log('🔄 Sending Order Status Update Email (Processing)...');
        const processingResult = await sendOrderStatusUpdate({
            ...sampleStatusUpdateData,
            status: 'processing',
            note: 'Your order is being processed and prepared for shipment.'
        });
        console.log('✅ Processing Status Email sent:', processingResult.success ? 'SUCCESS' : 'FAILED');
        console.log('');

        // 5. Order Status Update Email (Shipped)
        console.log('🚚 Sending Order Status Update Email (Shipped)...');
        const shippedResult = await sendOrderStatusUpdate({
            ...sampleStatusUpdateData,
            status: 'shipped',
            note: 'Your order has been shipped and is on its way to you.'
        });
        console.log('✅ Shipped Status Email sent:', shippedResult.success ? 'SUCCESS' : 'FAILED');
        console.log('');

        // 6. Order Status Update Email (Delivered)
        console.log('✅ Sending Order Status Update Email (Delivered)...');
        const deliveredResult = await sendOrderStatusUpdate({
            ...sampleStatusUpdateData,
            status: 'delivered',
            note: 'Your order has been successfully delivered. Thank you for shopping with us!'
        });
        console.log('✅ Delivered Status Email sent:', deliveredResult.success ? 'SUCCESS' : 'FAILED');
        console.log('');

        // 7. Delivery Confirmation Email
        console.log('📦 Sending Delivery Confirmation Email...');
        const deliveryResult = await sendDeliveryNotification(sampleDeliveryData);
        console.log('✅ Delivery Confirmation Email sent:', deliveryResult.success ? 'SUCCESS' : 'FAILED');
        console.log('');

        // 8. Issue Notification Email
        console.log('⚠️ Sending Issue Notification Email...');
        const issueResult = await sendIssueNotification(sampleIssueData);
        console.log('✅ Issue Notification Email sent:', issueResult.success ? 'SUCCESS' : 'FAILED');
        console.log('');

        console.log('🎉 All sample emails have been sent!');
        console.log('📬 Check onyangoantone1@gmail.com for all the sample emails.');

    } catch (error) {
        console.error('❌ Error sending sample emails:', error);
    }
};

// Run the script
sendSampleEmails();