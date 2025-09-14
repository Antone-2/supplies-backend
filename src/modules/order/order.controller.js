const PDFDocument = require("pdfkit");
const orderModel = require("../../../Database/models/order.model.js");
const cartModel = require("../../../Database/models/cart.model.js");
const productModel = require("../../../Database/models/product.model.js");
const userModel = require("../../../Database/models/user.model.js");
const { calculateShippingFee } = require("../../config/shippingConfig.js");
const { sendSMS } = require("../../utils/smsService.js");
const { sendEmail } = require("../../utils/emailService.js");
const pesaPalConfig = require("../../config/pesaPalConfig.js");

// Download PDF invoice for an order (admin or user)
const downloadOrderInvoice = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const order = await orderModel.findById(orderId).populate('user');
    if (!order) {
      return res.status(404).json({ status: 'error', message: 'Order not found' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice_${order._id}.pdf`);
    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);

    doc.fontSize(20).text('Medhelm Supplies', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(`Order Invoice`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Order ID: ${order._id}`);
    doc.text(`Date: ${order.createdAt ? new Date(order.createdAt).toLocaleString() : ''}`);
    doc.text(`Customer: ${order.user?.email || order.user}`);
    doc.text(`Shipping: ${(order.shippingAddress?.address || '') + ' ' + (order.shippingAddress?.city || '') + ' ' + (order.shippingAddress?.country || '')}`);
    doc.moveDown();

    doc.text('Items:', { underline: true });
    (order.items || order.cartItem || []).forEach((item, idx) => {
      doc.text(`${idx + 1}. ${item.product?.name || item.productId || item.product} x${item.quantity} @ KES ${item.price || item.unitPrice || '-'}`);
    });
    doc.moveDown();
    doc.text(`Total: KES ${order.totalAmount?.toLocaleString?.() || order.totalAmount}`, { bold: true });
    doc.moveDown();
    doc.text('Thank you for your purchase!', { align: 'center' });
    doc.end();
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to generate invoice', error: error.message });
  }
};

// Order verification handler
const verifyOrder = async (req, res, next) => {
  // You can add real verification logic here
  res.status(200).json({ message: "Order verified!" });
};

// Calculate shipping fee based on distance
const calculateShippingFeeHandler = async (req, res, next) => {
  try {
    const { origin, destination } = req.body;
    if (!origin || !destination) {
      return res.status(400).json({ status: 'error', message: 'Origin and destination required' });
    }
    const fee = await calculateShippingFee(origin, destination);
    res.status(200).json({ shippingFee: fee });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to calculate shipping fee', error: error.message });
  }
};

// Analytics: Get order and sales stats (admin only)
const getOrderAnalytics = async (req, res, next) => {
  try {
    const totalOrders = await orderModel.countDocuments();
    const totalSalesAgg = await orderModel.aggregate([
      { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ]);
    const totalSales = totalSalesAgg[0]?.total || 0;
    const totalUsers = await orderModel.distinct("user").then(users => users.length);

    // Sales per month (last 12 months)
    const salesPerMonth = await orderModel.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          total: { $sum: "$totalAmount" },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Top products (by quantity sold)
    const topProducts = await orderModel.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          name: { $first: "$items.product.name" },
          quantity: { $sum: "$items.quantity" },
          totalSales: { $sum: { $multiply: ["$items.quantity", "$items.price"] } }
        }
      },
      { $sort: { quantity: -1 } },
      { $limit: 5 }
    ]);

    res.status(200).json({
      totalOrders,
      totalSales,
      totalUsers,
      salesPerMonth,
      topProducts
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to get analytics', error: error.message });
  }
};

// Bulk update order statuses (admin only)
const bulkUpdateOrderStatus = async (req, res, next) => {
  try {
    const { orderIds, status } = req.body;
    const allowedStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!Array.isArray(orderIds) || !allowedStatuses.includes(status)) {
      return res.status(400).json({ status: 'error', message: 'Invalid input' });
    }
    const result = await orderModel.updateMany(
      { _id: { $in: orderIds } },
      {
        $set: { orderStatus: status },
        $push: {
          timeline: { status, changedAt: new Date(), note: 'Bulk update' },
          activityLog: {
            action: 'bulk_status_update',
            user: req.user._id,
            message: `Order status changed to ${status} (bulk)`,
            createdAt: new Date()
          }
        }
      }
    );
    res.status(200).json({ message: 'Bulk update complete', modifiedCount: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to bulk update', error: error.message });
  }
};

// Update order status and log timeline/activity (admin only)
const updateOrderStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { status, note } = req.body;
    const allowedStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ status: 'error', message: 'Invalid status value' });
    }
    const order = await orderModel.findById(orderId).populate('user');
    if (!order) {
      return res.status(404).json({ status: 'error', message: 'Order not found' });
    }
    order.orderStatus = status;
    order.timeline.push({ status, changedAt: new Date(), note });
    order.activityLog.push({
      action: 'status_update',
      user: req.user._id,
      message: `Order status changed to ${status}${note ? ': ' + note : ''}`,
      createdAt: new Date()
    });
    await order.save();

    // Send email notification to customer
    const customerEmail = order.shippingAddress?.email || order.user?.email;
    if (customerEmail) {
      let statusMsg = '';
      switch (status) {
        case 'pending': statusMsg = 'Your order has been received and is pending.'; break;
        case 'confirmed': statusMsg = 'Your order has been confirmed.'; break;
        case 'processing': statusMsg = 'Your order is being processed.'; break;
        case 'shipped': statusMsg = 'Your order has been shipped.'; break;
        case 'delivered': statusMsg = 'Your order has been delivered.'; break;
        case 'cancelled': statusMsg = 'Your order has been cancelled.'; break;
        default: statusMsg = `Order status updated: ${status}`;
      }
      const html = `<p>Dear Customer,</p>
        <p>${statusMsg}</p>
        <p><b>Order ID:</b> ${order._id}</p>
        <p><b>Status:</b> ${status}</p>
        <p>Thank you for shopping with Medhelm Supplies.</p>`;
      try {
        await sendEmail(customerEmail, `Order Status Update: ${status}`, html);
      } catch (e) {
        console.error('Failed to send status update email:', e);
      }
    }

    // Send SMS for all status changes
    if (order.shippingAddress && order.shippingAddress.phone) {
      try {
        await sendSMS(order.shippingAddress.phone, `${statusMsg} (Order ID: ${order._id})`);
      } catch (e) {
        console.error('Failed to send status update SMS:', e);
      }
    }
    res.status(200).json({ message: 'Order status updated', order });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to update order status', error: error.message });
  }
};

// Add note to order (admin or user)
const addOrderNote = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { content } = req.body;
    const order = await orderModel.findById(orderId);
    if (!order) {
      return res.status(404).json({ status: 'error', message: 'Order not found' });
    }
    order.notes.push({ author: req.user._id, content, createdAt: new Date() });
    order.activityLog.push({
      action: 'add_note',
      user: req.user._id,
      message: `Note added: ${content}`,
      createdAt: new Date()
    });
    await order.save();
    res.status(200).json({ message: 'Note added', order });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to add note', error: error.message });
  }
};

// Get order timeline and activity log (admin or user)
const getOrderHistory = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const order = await orderModel.findById(orderId)
      .populate('notes.author', 'name email')
      .populate('activityLog.user', 'name email');
    if (!order) {
      return res.status(404).json({ status: 'error', message: 'Order not found' });
    }
    res.status(200).json({
      notes: order.notes,
      activityLog: order.activityLog,
      timeline: order.timeline
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to get order history', error: error.message });
  }
};

const createCashOrder = async (req, res, next) => {
  try {
    const { items, shippingAddress, totalAmount } = req.body;
    if (!items || !shippingAddress || !totalAmount) {
      return res.status(400).json({ status: 'error', message: 'Missing order data' });
    }

    const order = new orderModel({
      user: req.user._id,
      items,
      totalAmount,
      shippingAddress,
      timeline: [
        {
          status: 'pending',
          changedAt: new Date(),
          note: 'Order created'
        }
      ],
      activityLog: [
        {
          action: 'create',
          user: req.user._id,
          message: 'Order created',
          createdAt: new Date()
        }
      ]
    });
    await order.save();

    if (order) {
      let options = items.map((item) => ({
        updateOne: {
          filter: { _id: item.product },
          update: { $inc: { countInStock: -item.quantity } },
        },
      }));
      await productModel.bulkWrite(options);

      // Optionally clear user's cart here if needed

      // Send notification (email and SMS)
      const trackingCode = order._id.toString();
      const userEmail = req.user.email;
      const userPhone = shippingAddress?.phone;
      const deliveryContact = shippingAddress?.phone || req.user.phone || 'N/A';

      // Generate a unique return authorization number
      const returnAuth = `RET-${trackingCode.slice(-6).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const returnInstructions = `If you need to return your order, please use the following Return Authorization Number: <b>${returnAuth}</b> and contact returns@medhelmsupplies.co.ke. Follow the instructions provided in your account or contact our support team.`;

      // Order confirmation email
      const orderMsg = `
        <p>Your order has been placed!<br>
        <b>Tracking code:</b> ${trackingCode}<br>
        <b>Delivery contact:</b> ${deliveryContact}<br>
        <b>Return instructions:</b> ${returnInstructions}</p>
      `;
      if (userEmail) {
        await sendEmail(userEmail, 'Order Confirmation', orderMsg);
      }
      if (userPhone) {
        await sendSMS(userPhone, `Order placed! Tracking: ${trackingCode}. Delivery contact: ${deliveryContact}`);
      }

      // Dispatch notification (simulate dispatch event)
      const dispatchMsg = `
        <p>Your order has been dispatched!<br>
        <b>Tracking code:</b> ${trackingCode}<br>
        <b>Delivery contact:</b> ${deliveryContact}<br>
        You will be contacted by our delivery team.<br>
        ${returnInstructions}
        </p>
      `;
      if (userEmail) {
        await sendEmail(userEmail, 'Order Dispatched', dispatchMsg);
      }
      if (userPhone) {
        await sendSMS(userPhone, `Order dispatched! Tracking: ${trackingCode}. Delivery contact: ${deliveryContact}`);
      }

      return res.status(201).json({ message: "success", order, trackingCode, returnAuth });
    } else {
      return res.status(400).json({ status: 'error', message: 'Error creating order' });
    }
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to create order', error: error.message });
  }
};

const getSpecificOrder = async (req, res, next) => {
  try {
    console.log(req.user._id);

    let order = await orderModel
      .findOne({ userId: req.user._id })
      .populate("cartItems.productId");

    res.status(200).json({ message: "success", order });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to get order', error: error.message });
  }
};

const getAllOrders = async (req, res, next) => {
  try {
    let orders = await orderModel.findOne({}).populate("cartItems.productId");

    res.status(200).json({ message: "success", orders });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to get orders', error: error.message });
  }
};

// Pesapal integration dependencies
const axios = require('axios');
const qs = require('querystring');

// Helper: Get Pesapal OAuth token
async function getPesapalToken() {
  const consumerKey = pesaPalConfig.api.consumerKey;
  const consumerSecret = pesaPalConfig.api.consumerSecret;
  try {
    const res = await axios.post(pesaPalConfig.api.baseUrl + '/api/Auth/RequestToken', {
      consumer_key: consumerKey,
      consumer_secret: consumerSecret
    });
    return res.data.token;
  } catch (error) {
    console.error('Failed to get Pesapal token:', error.response?.data || error.message);
    throw new Error('Pesapal authentication failed');
  }
}

// Create Pesapal order (checkout session)
const createCheckOutSession = async (req, res, next) => {
  try {
    const { amount, description, callback_url, email, phone, orderData } = req.body;

    // First, create the order in our database
    const order = new orderModel({
      user: req.user._id,
      items: orderData.items,
      totalAmount: orderData.totalAmount,
      shippingAddress: orderData.shippingAddress,
      shippingFee: orderData.shippingFee,
      subtotal: orderData.subtotal,
      paymentMethod: 'PESAPAL',
      orderStatus: 'pending',
      timeline: [
        {
          status: 'pending',
          changedAt: new Date(),
          note: 'Order created, awaiting payment'
        }
      ],
      activityLog: [
        {
          action: 'create',
          user: req.user._id,
          message: 'Order created via Pesapal checkout',
          createdAt: new Date()
        }
      ]
    });
    await order.save();

    // Update inventory
    let options = orderData.items.map((item) => ({
      updateOne: {
        filter: { _id: item.product },
        update: { $inc: { countInStock: -item.quantity } },
      },
    }));
    await productModel.bulkWrite(options);

    // Create Pesapal checkout session
    const token = await getPesapalToken();

    // Build Pesapal order object conditionally
    const pesapalOrderBase = {
      id: order._id.toString(), // Use our order ID as merchant reference
      currency: 'KES',
      amount: amount,
      description: description || 'Order Payment',
      callback_url: callback_url || (process.env.FRONTEND_URL + '/checkout'),
      billing_address: {
        email_address: email,
        phone_number: phone,
        country_code: 'KE',
        first_name: req.user?.name || 'Customer',
        last_name: ''
      }
    };

    // Conditionally add notification_id for production only
    // Sandbox environments don't require valid IPN IDs
    // For production, only add notification_id if a valid IPN ID is configured
    let pesapalOrder = pesapalOrderBase;
    if (process.env.NODE_ENV === 'production' && process.env.PESAPAL_IPN_ID) {
      pesapalOrder = { ...pesapalOrderBase, notification_id: process.env.PESAPAL_IPN_ID };
    }
    // For sandbox/development, omit notification_id entirely

    let orderRes;
    try {
      orderRes = await axios.post(pesaPalConfig.api.baseUrl + '/api/Transactions/SubmitOrderRequest', pesapalOrder, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Pesapal SubmitOrderRequest failed:', error.response?.data || error.message);
      return res.status(500).json({ status: 'error', message: 'Failed to create Pesapal checkout session', error: error.response?.data || error.message });
    }

    res.json({
      payment_url: orderRes.data.redirect_url,
      order_id: order._id
    });
  } catch (error) {
    console.error('createCheckOutSession error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to create checkout session', error: error.message });
  }
};

// Pesapal IPN/notification handler (production-ready)
const createOnlineOrder = async (req, res, next) => {
  try {
    // Pesapal sends payment notification (IPN) to this endpoint
    const { notification_type, transaction_tracking_id, merchant_reference } = req.body;
    if (!transaction_tracking_id || !merchant_reference) {
      return res.status(400).json({ message: 'Missing Pesapal transaction data.' });
    }

    // Step 1: Validate payment status with Pesapal
    const token = await getPesapalToken();
    const statusUrl = `${pesaPalConfig.api.baseUrl}/api/Transactions/GetTransactionStatus?orderTrackingId=${transaction_tracking_id}`;
    let paymentStatus = 'INVALID';
    try {
      const statusRes = await axios.get(statusUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      paymentStatus = statusRes.data.status;
    } catch (err) {
      return res.status(500).json({ message: 'Failed to verify payment with Pesapal.' });
    }

    // Step 2: Update order in DB if payment is completed
    if (paymentStatus === 'COMPLETED') {
      const order = await orderModel.findOneAndUpdate(
        { _id: merchant_reference },
        { isPaid: true, paidAt: new Date(), paymentMethod: 'PESAPAL', paymentResult: { transaction_tracking_id, status: paymentStatus } },
        { new: true }
      );
      if (!order) return res.status(404).json({ message: 'Order not found.' });
      // Optionally, update inventory, send confirmation email, etc.
      return res.status(200).json({ message: 'Payment confirmed and order updated.', order });
    } else {
      return res.status(200).json({ message: `Payment status: ${paymentStatus}` });
    }
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to process online order', error: error.message });
  }
};

// Secure Airtel Money payment endpoint
const payAirtelMoney = async (req, res, next) => {
  try {
    const { phone, pin, amount, orderId } = req.body;
    if (!phone || !pin || !amount || !orderId) {
      return res.status(400).json({ status: 'error', message: 'All fields required' });
    }
    // TODO: Integrate with Airtel Money API securely (do not store PIN)
    // Example: await airtelApi.pay({ phone, pin, amount });
    // Mark order as paid if successful
    // For now, simulate success:
    // You should verify with the real API and handle errors
    res.status(200).json({ message: "Airtel Money payment successful", orderId });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to process Airtel Money payment', error: error.message });
  }
};

// Secure M-Pesa payment endpoint
const payMpesa = async (req, res, next) => {
  try {
    const { phone, pin, amount, orderId } = req.body;
    if (!phone || !pin || !amount || !orderId) {
      return res.status(400).json({ status: 'error', message: 'All fields required' });
    }
    // TODO: Integrate with M-Pesa API securely (do not store PIN)
    // Example: await mpesaApi.pay({ phone, pin, amount });
    // Mark order as paid if successful
    // For now, simulate success:
    // You should verify with the real API and handle errors
    res.status(200).json({ message: "M-Pesa payment successful", orderId });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to process M-Pesa payment', error: error.message });
  }
};

async function card(e, res) {
  try {
    let cart = await cartModel.findById(e.client_reference_id);

    if (!cart) {
      return res.status(404).json({ status: 'error', message: 'Cart was not found' });
    }

    let user = await userModel.findOne({ email: e.customer_email })
    const order = new orderModel({
      userId: user._id,
      cartItem: cart.cartItem,
      totalOrderPrice: e.amount_total / 100,
      shippingAddress: e.metadata.shippingAddress,
      paymentMethod: "card",
      isPaid: true,
      paidAt: Date.now()
    });

    await order.save();

    // console.log(order);
    if (order) {
      let options = cart.cartItem.map((item) => ({
        updateOne: {
          filter: { _id: item.productId },
          update: { $inc: { quantity: -item.quantity, sold: item.quantity } },
        },
      }));

      await productModel.bulkWrite(options);

      await cartModel.findOneAndDelete({ userId: user._id });

      return res.status(201).json({ message: "success", order });
    } else {
      return res.status(400).json({ status: 'error', message: 'Error in cart ID' });
    }
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to process card payment', error: error.message });
  }
}

module.exports = {
  createCashOrder,
  getSpecificOrder,
  getAllOrders,
  createCheckOutSession,
  createOnlineOrder,
  updateOrderStatus,
  addOrderNote,
  getOrderHistory,
  getOrderAnalytics,
  downloadOrderInvoice,
  bulkUpdateOrderStatus,
  calculateShippingFee: calculateShippingFeeHandler,
  payAirtelMoney,
  payMpesa,
  verifyOrder,
};
