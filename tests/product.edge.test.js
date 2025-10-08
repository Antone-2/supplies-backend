const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const productRoutes = require('../src/modules/product/product.routes');
const app = express();
app.use(express.json());
app.use('/api/v1/products', productRoutes);

describe('Product API Edge Cases', () => {
    beforeAll(async () => {
        await mongoose.connect(process.env.MONGO_URI, { connectTimeoutMS: 20000 });
    });
    afterAll(async () => {
        await mongoose.disconnect();
    });

    it('should reject invalid product creation', async () => {
        const res = await request(app)
            .post('/api/v1/products')
            .send({ name: '', price: -10, category: '' });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('message', 'Validation error');
    });

    it('should handle non-existent product update', async () => {
        const res = await request(app)
            .put('/api/v1/products/000000000000000000000000')
            .send({ name: 'Test', price: 100, category: 'TestCat' });
        expect([400, 404]).toContain(res.statusCode);
    });

    it('should handle non-existent product delete', async () => {
        const res = await request(app)
            .delete('/api/v1/products/000000000000000000000000');
        expect([400, 404]).toContain(res.statusCode);
    });
});
