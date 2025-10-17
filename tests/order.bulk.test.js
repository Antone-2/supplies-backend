const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Order = require('../Database/models/order.model');
const User = require('../Database/models/user.model');
const bcrypt = require('bcrypt');

describe('Order Bulk Operations', () => {
    let adminToken;
    let adminUser;
    let testOrders = [];

    beforeAll(async () => {
        // Create a test admin user
        const hashedPassword = await bcrypt.hash('admin123', 10);
        adminUser = await User.create({
            name: 'Test Admin',
            email: 'admin@test.com',
            password: hashedPassword,
            role: 'admin',
            active: true
        });

        // Login to get admin token
        const loginResponse = await request(app)
            .post('/api/v1/admin/auth/login')
            .send({
                email: 'admin@test.com',
                password: 'admin123'
            });
        adminToken = loginResponse.body.token;

        // Create test orders
        for (let i = 0; i < 3; i++) {
            const order = await Order.create({
                orderNumber: `TEST-${i}`,
                items: [{
                    productId: `prod-${i}`,
                    name: `Product ${i}`,
                    quantity: 1,
                    price: 100
                }],
                shippingAddress: {
                    fullName: 'Test User',
                    email: 'test@example.com',
                    phone: '0712345678',
                    address: 'Test Address',
                    city: 'Nairobi',
                    county: 'Nairobi',
                    deliveryLocation: 'CBD'
                },
                totalAmount: 100,
                paymentMethod: 'pesapal',
                orderStatus: 'pending',
                paymentStatus: 'pending',
                timeline: [{
                    status: 'pending',
                    changedAt: new Date(),
                    note: 'Order created'
                }]
            });
            testOrders.push(order);
        }
    });

    afterAll(async () => {
        // Clean up test data
        if (adminUser) {
            await User.findByIdAndDelete(adminUser._id);
        }
        for (const order of testOrders) {
            await Order.findByIdAndDelete(order._id);
        }
    });

    describe('DELETE /api/v1/admin/orders/bulk', () => {
        it('should return 503 when MongoDB is disconnected', async () => {
            // Disconnect MongoDB temporarily
            await mongoose.connection.close();

            const response = await request(app)
                .delete('/api/v1/admin/orders/bulk')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    orderIds: testOrders.map(order => order._id.toString())
                });

            expect(response.status).toBe(503);
            expect(response.body.message).toBe('Database connection unavailable. Please try again later.');

            // Reconnect MongoDB
            await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        });

        it('should successfully delete orders when MongoDB is connected', async () => {
            const response = await request(app)
                .delete('/api/v1/admin/orders/bulk')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    orderIds: testOrders.slice(0, 2).map(order => order._id.toString())
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message');
            expect(response.body).toHaveProperty('deletedCount');
            expect(response.body.deletedCount).toBe(2);
        });

        it('should return 400 for invalid request body', async () => {
            const response = await request(app)
                .delete('/api/v1/admin/orders/bulk')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Order IDs array is required');
        });
    });

    describe('PUT /api/v1/admin/orders/bulk', () => {
        it('should return 503 when MongoDB is disconnected', async () => {
            // Disconnect MongoDB temporarily
            await mongoose.connection.close();

            const response = await request(app)
                .put('/api/v1/admin/orders/bulk')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    orderIds: [testOrders[2]._id.toString()],
                    updates: { orderStatus: 'shipped' }
                });

            expect(response.status).toBe(503);
            expect(response.body.message).toBe('Database connection unavailable. Please try again later.');

            // Reconnect MongoDB
            await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        });

        it('should successfully update orders when MongoDB is connected', async () => {
            const response = await request(app)
                .put('/api/v1/admin/orders/bulk')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    orderIds: [testOrders[2]._id.toString()],
                    updates: { orderStatus: 'shipped', trackingNumber: 'TN123' }
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message');
            expect(response.body).toHaveProperty('updatedCount');
            expect(response.body.updatedCount).toBe(1);
        });

        it('should return 400 for invalid update fields', async () => {
            const response = await request(app)
                .put('/api/v1/admin/orders/bulk')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    orderIds: [testOrders[2]._id.toString()],
                    updates: { invalidField: 'value' }
                });

            expect(response.status).toBe(400);
            expect(response.body.message).toContain('Invalid update fields');
        });

        it('should return 400 for missing orderIds', async () => {
            const response = await request(app)
                .put('/api/v1/admin/orders/bulk')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    updates: { orderStatus: 'shipped' }
                });

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Order IDs array is required');
        });
    });
});
