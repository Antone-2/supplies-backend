import { sendOrderStatusUpdateSMS, sendShippingNotificationSMS, sendDeliveryNotificationSMS } from './src/services/smsService.js';

async function testSMS() {
    console.log('Testing SMS service functions...');

    const result1 = await sendOrderStatusUpdateSMS('+254712345678', {
        name: 'John Doe',
        orderId: 'ORD-12345',
        status: 'processing'
    });
    console.log('Order status SMS result:', result1);

    const result2 = await sendShippingNotificationSMS('+254712345678', {
        name: 'John Doe',
        orderId: 'ORD-12345',
        trackingNumber: 'TRK123456'
    });
    console.log('Shipping SMS result:', result2);

    const result3 = await sendDeliveryNotificationSMS('+254712345678', {
        name: 'John Doe',
        orderId: 'ORD-12345'
    });
    console.log('Delivery SMS result:', result3);
}

testSMS().catch(console.error);
