// payment.api.test.js
// Integration tests for payment API endpoints

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');

// Use test database URI from environment; skip if not set to avoid leaking credentials
if (!process.env.MONGO_URI) {
  console.warn('MONGO_URI not provided – skipping payment API integration tests.');
  // eslint-disable-next-line jest/no-focused-tests
  describe.skip('Payment API', () => { it('skipped due to missing MONGO_URI', () => { }); });
  return; // Exit file early
}

const paymentRoutes = require('../src/modules/payment/payment.routes');
const app = express();
app.use(express.json());
app.use('/api/payment', paymentRoutes);

describe('Payment API', () => {
  jest.setTimeout(30000);

  beforeAll(async () => {
    try {
      await mongoose.connect(process.env.MONGO_URI, { connectTimeoutMS: 20000 });
    } catch (err) {
      console.error('beforeAll error:', err);
      throw err;
    }
  });
  afterAll(async () => {
    try {
      await mongoose.connection.close();
    } catch (err) {
      console.error('afterAll error:', err);
    }
  });

  it('should respond to a payment intent creation (scaffold)', async () => {
    const res = await request(app)
      .post('/api/payment/intent')
      .send({
        amount: 1000,
        currency: 'usd',
        // Add more fields as required by your payment API
      });
    // Accept 200 or 201 for now, update as needed
    expect([200, 201]).toContain(res.statusCode);
    expect(res.body).toHaveProperty('clientSecret');
  });
});
