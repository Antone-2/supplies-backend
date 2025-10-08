// report.api.test.js
// Integration tests for admin reporting endpoints

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const reportRoutes = require('../src/routes/reportRoutes');
const app = express();
app.use(express.json());
app.use('/api/v1/reports', reportRoutes);

describe('Report API', () => {
    jest.setTimeout(30000);

    beforeAll(async () => {
        await mongoose.connect(process.env.MONGO_URI, { connectTimeoutMS: 20000 });
    });
    afterAll(async () => {
        await mongoose.disconnect();
    });

    it('should get sales summary', async () => {
        const res = await request(app).get('/api/v1/reports/sales-summary');
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('totalOrders');
        expect(res.body).toHaveProperty('totalRevenue');
    });

    it('should get user growth', async () => {
        const res = await request(app).get('/api/v1/reports/user-growth');
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('totalUsers');
        expect(res.body).toHaveProperty('newUsersLast30Days');
    });

    it('should get top products', async () => {
        const res = await request(app).get('/api/v1/reports/top-products');
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('topProducts');
        expect(Array.isArray(res.body.topProducts)).toBe(true);
    });
});
