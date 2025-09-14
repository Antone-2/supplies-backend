// order.api.test.js
// Integration tests for order API endpoints

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');

// Use test database URI from environment; skip if not set to avoid leaking credentials
if (!process.env.MONGO_URI) {
  console.warn('MONGO_URI not provided – skipping order API integration tests.');
  // eslint-disable-next-line jest/no-focused-tests
  describe.skip('Order API', () => { it('skipped due to missing MONGO_URI', () => { }); });
  return; // Exit file early
}


// Minimal test route using local controller
const testOrderController = require('./order.test.controller');
const app = express();
app.use(express.json());
app.post('/api/order', testOrderController.createOrder);

describe('Order API', () => {
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

  it('should respond to order creation (scaffold)', async () => {
    const res = await request(app)
      .post('/api/order')
      .send({
        userId: new mongoose.Types.ObjectId(),
        items: [
          { productId: new mongoose.Types.ObjectId(), quantity: 2 }
        ],
        total: 1000
      });
    // Accept 200 or 201 for now, update as needed
    expect([200, 201]).toContain(res.statusCode);
    expect(res.body).toHaveProperty('_id');
  });
});
