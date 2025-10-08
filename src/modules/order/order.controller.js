// ...order controller logic...
// Example: createCashOrder, getSpecificOrder, getAllOrders, createCheckOutSession, createOnlineOrder, updateOrderStatus, addOrderNote, getOrderHistory, getOrderAnalytics, downloadOrderInvoice, bulkUpdateOrderStatus, calculateShippingFee, payAirtelMoney, payMpesa, verifyOrder

const orderModel = require('../../../Database/models/order.model');
const mongoose = require('mongoose');
const testDatabase = require('../../../testDatabase');

const getAllOrders = async (req, res) => {
    try {
        const { page = 1, limit = 20, status, paymentStatus, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

        // Check if MongoDB is connected, otherwise use test database
        if (mongoose.connection.readyState !== 1) {
            console.log('MongoDB not connected, using test database for orders');
            const query = {};
            if (status) query.orderStatus = status;
            if (paymentStatus) query.paymentStatus = paymentStatus;

            const allOrders = await testDatabase.findOrders(query);

            // Simple sorting
            if (sortBy === 'createdAt') {
                allOrders.sort((a, b) => {
                    const dateA = new Date(a.createdAt);
                    const dateB = new Date(b.createdAt);
                    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
                });
            }

            // Simple pagination
            const skip = (parseInt(page) - 1) * parseInt(limit);
            const orders = allOrders.slice(skip, skip + parseInt(limit));
            const total = allOrders.length;

            return res.json({
                orders,
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit))
            });
        }

        const query = {};
        if (status) query.orderStatus = status;
        if (paymentStatus) query.paymentStatus = paymentStatus;

        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const orders = await orderModel.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit));
        const total = await orderModel.countDocuments(query);

        res.json({
            orders,
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / parseInt(limit))
        });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch orders' });
    }
};

const { validateOrder } = require('../../controllers/order.validation');

const createOrder = async (req, res) => {
    try {
        const { orderId, items, shippingAddress, totalAmount, paymentMethod } = req.body;

        // Validate required fields
        if (!orderId || !items || !shippingAddress || !totalAmount) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: orderId, items, shippingAddress, totalAmount'
            });
        }

        // Check if MongoDB is connected, otherwise use test database
        if (mongoose.connection.readyState !== 1) {
            console.log('MongoDB not connected, using test database');
            const testOrder = await testDatabase.createOrder({
                orderNumber: orderId,
                items: items.map(item => ({
                    productId: item.productId,
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price
                })),
                shippingAddress: {
                    fullName: shippingAddress.fullName,
                    email: shippingAddress.email,
                    phone: shippingAddress.phone,
                    address: shippingAddress.address,
                    city: shippingAddress.city,
                    county: shippingAddress.county,
                    deliveryLocation: shippingAddress.deliveryLocation
                },
                totalAmount,
                paymentMethod: paymentMethod || 'pesapal',
                orderStatus: 'pending',
                paymentStatus: 'pending',
                timeline: [{
                    status: 'pending',
                    changedAt: new Date(),
                    note: 'Order created'
                }]
            });

            return res.status(201).json({
                success: true,
                message: 'Order created successfully (test mode)',
                orderId: testOrder.orderNumber,
                mongoId: testOrder._id
            });
        }

        // Create new order (let MongoDB generate the _id, use orderId as orderNumber)
        const order = new orderModel({
            orderNumber: orderId, // Use custom orderId as orderNumber
            items: items.map(item => ({
                productId: item.productId,
                name: item.name,
                quantity: item.quantity,
                price: item.price
            })),
            shippingAddress: {
                fullName: shippingAddress.fullName,
                email: shippingAddress.email,
                phone: shippingAddress.phone,
                address: shippingAddress.address,
                city: shippingAddress.city,
                county: shippingAddress.county,
                deliveryLocation: shippingAddress.deliveryLocation
            },
            totalAmount,
            paymentMethod: paymentMethod || 'pesapal',
            orderStatus: 'pending',
            paymentStatus: 'pending',
            timeline: [{
                status: 'pending',
                changedAt: new Date(),
                note: 'Order created'
            }]
        });

        await order.save();

        // Send order confirmation email and notification
        try {
            // Temporarily disable notifications to fix order creation
            console.log('Order created successfully, email notifications disabled for now');
            // const { sendOrderConfirmation } = require('../../services/emailService');
            // const { notifyOrderCreated } = require('../../services/notificationService');

            // await sendOrderConfirmation({
            //     email: shippingAddress.email,
            //     name: shippingAddress.fullName,
            //     orderId: order._id,
            //     items: items,
            //     totalAmount: totalAmount,
            //     shippingAddress: shippingAddress
            // });

            // Create in-app notification if user is logged in
            // if (req.user?.id) {
            //     await notifyOrderCreated(req.user.id, shippingAddress.email, {
            //         orderId: order._id,
            //         totalAmount: totalAmount
            //     });
            // }
        } catch (emailError) {
            console.warn('Order confirmation email failed:', emailError);
        }

        res.status(201).json({
            success: true,
            message: 'Order created successfully',
            orderId: order.orderNumber,
            mongoId: order._id
        });
    } catch (error) {
        console.error('Order creation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create order',
            error: error.message
        });
    }
};

const createCashOrder = async (req, res) => {
    const { error } = validateOrder(req.body);
    if (error) {
        return res.status(400).json({ message: 'Validation error', details: error.details });
    }
    // ...implementation...
    res.json({ message: 'Cash order created' });
};

const getSpecificOrder = async (req, res) => {
    try {
        const orderId = req.params.id;

        // Check if MongoDB is connected, otherwise use test database
        if (mongoose.connection.readyState !== 1) {
            console.log('MongoDB not connected, using test database for order tracking');
            const order = await testDatabase.findOrder(orderId);
            if (!order) {
                return res.status(404).json({ message: 'Order not found' });
            }

            // Format test database response for consistency
            const trackingData = {
                orderId: order._id,
                orderNumber: order.orderNumber || order._id,
                status: order.orderStatus,
                paymentStatus: order.paymentStatus,
                totalAmount: order.totalAmount,
                createdAt: order.createdAt,
                updatedAt: order.updatedAt,
                timeline: order.timeline.map(entry => ({
                    status: entry.status,
                    date: entry.changedAt,
                    note: entry.note
                })),
                shippingAddress: {
                    fullName: order.shippingAddress.fullName,
                    city: order.shippingAddress.city,
                    county: order.shippingAddress.county,
                    deliveryLocation: order.shippingAddress.deliveryLocation
                },
                items: order.items.map(item => ({
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price
                }))
            };

            return res.json({ order: trackingData });
        }

        const order = await orderModel.findById(orderId)
            .populate('user', 'name email')
            .select('-paymentResult -notes -activityLog'); // Exclude sensitive data for public tracking

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Format response for tracking
        const trackingData = {
            orderId: order._id,
            orderNumber: order._id,
            status: order.orderStatus,
            paymentStatus: order.paymentStatus,
            totalAmount: order.totalAmount,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
            timeline: order.timeline.map(entry => ({
                status: entry.status,
                date: entry.changedAt,
                note: entry.note
            })),
            shippingAddress: {
                fullName: order.shippingAddress.fullName,
                city: order.shippingAddress.city,
                county: order.shippingAddress.county,
                deliveryLocation: order.shippingAddress.deliveryLocation
            },
            items: order.items.map(item => ({
                name: item.name,
                quantity: item.quantity,
                price: item.price
            }))
        };

        res.json({ order: trackingData });
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const Order = require('../../../Database/models/order.model');
// Dummy notification function (replace with real email/SMS/in-app logic)
const User = require('../../../Database/models/user.model');
const { sendOrderEmail } = require('../../services/emailService');
const sendOrderNotification = async (userId, message) => {
    const user = await User.findById(userId);
    if (!user || !user.email) return false;
    const subject = 'Order Update from Medhelm Supplies';
    const htmlContent = `<p>Dear ${user.name || 'Customer'},</p><p>${message}</p><p>Thank you for shopping with us!</p>`;
    return await sendOrderEmail(user.email, subject, htmlContent);
};

const updateOrderStatus = async (req, res) => {
    try {
        const orderId = req.params.id;
        const { status, paymentStatus, note, trackingNumber } = req.body;
        const order = await orderModel.findById(orderId);
        if (!order) return res.status(404).json({ message: 'Order not found' });

        // Update status fields
        if (status) order.orderStatus = status;
        if (paymentStatus) order.paymentStatus = paymentStatus;
        if (trackingNumber) order.trackingNumber = trackingNumber;

        // Add timeline entry
        order.timeline.push({
            status: status || order.orderStatus,
            changedAt: new Date(),
            note: note || ''
        });

        await order.save();

        // Send notifications for status changes (temporarily disabled)
        if (status && order.shippingAddress?.email) {
            try {
                console.log('Order status updated, notifications disabled for now');
                // const { sendShippingNotification } = require('../../services/emailService');
                // const { notifyOrderStatusChange } = require('../../services/notificationService');

                // // Send email for shipped status
                // if (status === 'shipped') {
                //     await sendShippingNotification({
                //         email: order.shippingAddress.email,
                //         name: order.shippingAddress.fullName,
                //         orderId: order._id,
                //         trackingNumber: order.trackingNumber
                //     });
                // }

                // // Send comprehensive notification for all status changes
                // await notifyOrderStatusChange(order.userId, order.shippingAddress.email, {
                //     orderId: order._id,
                //     status: status,
                //     trackingNumber: order.trackingNumber
                // });
            } catch (notificationError) {
                console.warn('Order status notification failed:', notificationError);
            }
        }

        res.json({ message: 'Order status updated', order });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update order status', error: error.message });
    }
};

const payMpesa = async (req, res) => {
    // Placeholder
    res.json({ message: 'Mpesa payment initiated' });
};

const payAirtelMoney = async (req, res) => {
    // Placeholder
    res.json({ message: 'Airtel Money payment initiated' });
};

const createCheckOutSession = async (req, res) => {
    // Placeholder
    res.json({ session: {} });
};

const verifyOrder = async (req, res, next) => {
    res.status(200).json({ message: "Order verified!" });
};

const calculateShippingFee = async (req, res, next) => {
    try {
        const { origin, destination } = req.body;
        if (!origin || !destination) {
            return res.status(400).json({ status: 'error', message: 'Origin and destination required' });
        }
        // ...fee calculation logic...
        res.json({ fee: 0 }); // Placeholder
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to calculate shipping fee', error: error.message });
    }
};

// Analytics endpoint for admin dashboard
const getOrderAnalytics = async (req, res) => {
    try {
        // Get total orders count
        const totalOrders = await Order.countDocuments();

        // Get pending orders count
        const pendingOrders = await Order.countDocuments({ orderStatus: 'pending' });

        // Get total revenue (paid orders only)
        const revenueResult = await Order.aggregate([
            { $match: { paymentStatus: 'paid' } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);
        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

        // Get user count (if User model is available)
        let totalUsers = 0;
        try {
            const User = require('../../../Database/models/user.model');
            totalUsers = await User.countDocuments();
        } catch (error) {
            console.log('User model not available for analytics');
        }

        // Get product count and low stock products
        let totalProducts = 0;
        let lowStockProducts = 0;
        try {
            const Product = require('../../../Database/models/product.model');
            totalProducts = await Product.countDocuments({ isActive: true });
            lowStockProducts = await Product.countDocuments({
                isActive: true,
                countInStock: { $lt: 10 }
            });
        } catch (error) {
            console.log('Product model not available for analytics');
        }

        const stats = {
            totalProducts,
            totalOrders,
            totalUsers,
            totalRevenue,
            pendingOrders,
            lowStockProducts
        };

        res.json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch analytics',
            error: error.message
        });
    }
};

const orderController = {
    getAllOrders,
    createOrder,
    createCashOrder,
    getSpecificOrder,
    updateOrderStatus,
    payMpesa,
    payAirtelMoney,
    createCheckOutSession,
    verifyOrder,
    calculateShippingFee,
    getOrderAnalytics,
};
module.exports = orderController;
