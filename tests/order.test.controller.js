// order.test.controller.js
// Minimal order controller for isolated test use
exports.createOrder = async (req, res) => {
  try {
    const { userId, items, total } = req.body;
    if (!userId || !items || !total) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    // Simulate order creation
    const order = {
      _id: new (require('mongoose').Types.ObjectId)(),
      userId,
      items,
      total
    };
    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error creating order', error: error.message });
  }
};
