// ...order controller logic...
// Example: createCashOrder, getSpecificOrder, getAllOrders, createCheckOutSession, createOnlineOrder, updateOrderStatus, addOrderNote, getOrderHistory, getOrderAnalytics, downloadOrderInvoice, bulkUpdateOrderStatus, calculateShippingFee, payAirtelMoney, payMpesa, verifyOrder

import orderModel from '../../../Database/models/order.model.js';
import mongoose from 'mongoose';
import User from '../../../Database/models/user.model.js';
import Product from '../../../Database/models/product.model.js';
import Category from '../../../Database/models/category.model.js';
import { sendOrderEmail, sendOrderConfirmation } from '../../services/emailService.js';
import { sendOrderConfirmationSMS } from '../../services/smsService.js';
import { initiatePesapalPayment } from '../../services/pesapalService.js';
import testDatabase from '../../../testDatabase.js';

const getAllOrders = async (req, res) => {
    try {
        const { page = 1, limit = 20, status, paymentStatus, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

        // Check if MongoDB is connected
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ message: 'Database connection unavailable. Please try again later.' });
        }

        const query = {};
        if (status) query.orderStatus = status;
        if (paymentStatus) query.paymentStatus = paymentStatus;

        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const orders = await orderModel.find(query)
            .populate('user', 'name email')
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit));
        const total = await orderModel.countDocuments(query);

        // Format orders for admin view
        const formattedOrders = orders.map(order => ({
            id: order._id,
            orderNumber: order.orderNumber || order._id,
            customerId: order.user?._id || 'guest',
            customerName: order.shippingAddress?.fullName || order.user?.name || 'N/A',
            customerEmail: order.shippingAddress?.email || order.user?.email || 'N/A',
            items: order.items || [],
            total: order.totalAmount || 0,
            subtotal: order.subtotal || order.totalAmount || 0,
            tax: 0, // Not stored separately
            shipping: order.shippingFee || 0,
            status: order.orderStatus || 'pending',
            paymentStatus: order.paymentStatus || 'pending',
            shippingAddress: order.shippingAddress || {},
            billingAddress: order.shippingAddress || {}, // Same as shipping for now
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
            deliveryDate: null,
            trackingNumber: order.trackingNumber || null,
            transactionTrackingId: order.transactionTrackingId || null,
            transactionStatus: order.transactionStatus || null,
            paymentMethod: order.paymentMethod || 'pesapal'
        }));

        res.json({
            orders: formattedOrders,
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / parseInt(limit))
        });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch orders' });
    }
};

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

        // Send order confirmation email and SMS notification
        try {
            const { sendOrderConfirmation } = require('../../services/emailService');

            await sendOrderConfirmation({
                email: shippingAddress.email,
                name: shippingAddress.fullName,
                orderId: order.orderNumber,
                items: items,
                totalAmount: totalAmount,
                shippingAddress: shippingAddress
            });

            console.log('Order confirmation email sent successfully');
        } catch (emailError) {
            console.warn('Order confirmation email failed:', emailError);
        }

        // Send order confirmation SMS if phone number is provided
        if (shippingAddress.phone) {
            try {
                // Format phone number to international format if needed (assuming Kenyan numbers)
                let phoneNumber = shippingAddress.phone;
                if (phoneNumber.startsWith('0')) {
                    phoneNumber = '+254' + phoneNumber.substring(1);
                } else if (!phoneNumber.startsWith('+')) {
                    phoneNumber = '+254' + phoneNumber;
                }

                await sendOrderConfirmationSMS(phoneNumber, {
                    name: shippingAddress.fullName,
                    orderId: order.orderNumber,
                    totalAmount: totalAmount
                });
                console.log('Order confirmation SMS sent successfully');
            } catch (smsError) {
                console.warn('Order confirmation SMS failed:', smsError);
            }
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
    // Validation removed for now
    // const { error } = validateOrder(req.body);
    // if (error) {
    //     return res.status(400).json({ message: 'Validation error', details: error.details });
    // }
    // ...implementation...
    res.json({ message: 'Cash order created' });
};

const getSpecificOrder = async (req, res) => {
    try {
        const orderId = req.params.id;

        // Check if MongoDB is connected
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ message: 'Database connection unavailable. Please try again later.' });
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

// Dummy notification function (replace with real email/SMS/in-app logic)
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

        // Send notifications for status changes
        if (status && order.shippingAddress?.email) {
            try {
                const { sendOrderStatusUpdate, sendShippingNotification, sendDeliveryNotification } = require('../../services/emailService');

                // Send appropriate email based on status
                if (status === 'shipped') {
                    await sendShippingNotification({
                        email: order.shippingAddress.email,
                        name: order.shippingAddress.fullName,
                        orderId: order.orderNumber,
                        trackingNumber: order.trackingNumber
                    });
                } else if (status === 'delivered') {
                    await sendDeliveryNotification({
                        email: order.shippingAddress.email,
                        name: order.shippingAddress.fullName,
                        orderId: order.orderNumber,
                        deliveryDate: new Date()
                    });
                } else {
                    // Send general status update for other statuses
                    await sendOrderStatusUpdate({
                        email: order.shippingAddress.email,
                        name: order.shippingAddress.fullName,
                        orderId: order.orderNumber,
                        status: status,
                        trackingNumber: order.trackingNumber,
                        note: note
                    });
                }

                console.log(`Order status update email sent for status: ${status}`);
            } catch (notificationError) {
                console.warn('Order status notification email failed:', notificationError);
            }
        }

        // Send SMS notifications for status changes if phone number is provided
        if (status && order.shippingAddress?.phone) {
            try {
                const { sendOrderStatusUpdateSMS, sendShippingNotificationSMS, sendDeliveryNotificationSMS } = require('../../services/smsService');

                // Format phone number to international format if needed (assuming Kenyan numbers)
                let phoneNumber = order.shippingAddress.phone;
                if (phoneNumber.startsWith('0')) {
                    phoneNumber = '+254' + phoneNumber.substring(1);
                } else if (!phoneNumber.startsWith('+')) {
                    phoneNumber = '+254' + phoneNumber;
                }

                // Send appropriate SMS based on status
                if (status === 'shipped') {
                    await sendShippingNotificationSMS(phoneNumber, {
                        name: order.shippingAddress.fullName,
                        orderId: order.orderNumber,
                        trackingNumber: order.trackingNumber
                    });
                } else if (status === 'delivered') {
                    await sendDeliveryNotificationSMS(phoneNumber, {
                        name: order.shippingAddress.fullName,
                        orderId: order.orderNumber
                    });
                } else {
                    // Send general status update SMS for other statuses
                    await sendOrderStatusUpdateSMS(phoneNumber, {
                        name: order.shippingAddress.fullName,
                        orderId: order.orderNumber,
                        status: status
                    });
                }

                console.log(`Order status update SMS sent for status: ${status}`);
            } catch (smsError) {
                console.warn('Order status notification SMS failed:', smsError);
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
        // Check if MongoDB is connected
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ message: 'Database connection unavailable. Please try again later.' });
        }

        // Get total orders count
        const totalOrders = await orderModel.countDocuments();

        // Get pending orders count
        const pendingOrders = await orderModel.countDocuments({ orderStatus: 'pending' });

        // Get total revenue (paid orders only)
        const revenueResult = await orderModel.aggregate([
            { $match: { paymentStatus: 'paid' } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);
        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

        // Get user count
        let totalUsers = 0;
        try {
            totalUsers = await User.countDocuments();
        } catch (error) {
            console.log('User model query failed:', error.message);
            throw new Error('Failed to fetch user data');
        }

        // Get product count and low stock products
        let totalProducts = 0;
        let lowStockProducts = 0;
        try {
            totalProducts = await Product.countDocuments({ isActive: true });
            lowStockProducts = await Product.countDocuments({
                isActive: true,
                countInStock: { $lt: 10 }
            });
        } catch (error) {
            console.log('Product model query failed:', error.message);
            throw new Error('Failed to fetch product data');
        }

        // Get category count
        let totalCategories = 0;
        try {
            totalCategories = await Category.countDocuments({ isActive: true });
        } catch (error) {
            console.log('Category model not available for analytics');
            totalCategories = 0;
        }

        // Get new users this month
        let newUsers = 0;
        try {
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);
            newUsers = await User.countDocuments({ createdAt: { $gte: startOfMonth } });
        } catch (error) {
            console.log('Could not fetch new users count');
            throw new Error('Failed to fetch user growth data');
        }

        // Get monthly revenue data (last 6 months)
        const monthlyRevenue = [];
        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
            const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

            const monthResult = await orderModel.aggregate([
                {
                    $match: {
                        paymentStatus: 'paid',
                        createdAt: { $gte: monthStart, $lte: monthEnd }
                    }
                },
                {
                    $group: {
                        _id: null,
                        revenue: { $sum: '$totalAmount' },
                        orders: { $sum: 1 }
                    }
                }
            ]);

            monthlyRevenue.push({
                month: monthStart.toLocaleString('default', { month: 'short' }),
                revenue: monthResult.length > 0 ? monthResult[0].revenue : 0,
                orders: monthResult.length > 0 ? monthResult[0].orders : 0
            });
        }

        // Get top products by revenue
        const topProductsResult = await orderModel.aggregate([
            { $match: { paymentStatus: 'paid' } },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.productId',
                    name: { $first: '$items.name' },
                    sales: { $sum: '$items.quantity' },
                    revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
                }
            },
            { $sort: { revenue: -1 } },
            { $limit: 5 }
        ]);

        const topProducts = topProductsResult.map(product => ({
            name: product.name,
            sales: product.sales,
            revenue: product.revenue
        }));

        // Get order status breakdown
        const orderStatuses = await orderModel.aggregate([
            {
                $group: {
                    _id: '$orderStatus',
                    count: { $sum: 1 }
                }
            }
        ]);

        const orderStatusBreakdown = [
            { status: 'completed', count: 0 },
            { status: 'pending', count: 0 },
            { status: 'shipped', count: 0 },
            { status: 'cancelled', count: 0 }
        ];

        orderStatuses.forEach(status => {
            const index = orderStatusBreakdown.findIndex(s => s.status === status._id);
            if (index !== -1) {
                orderStatusBreakdown[index].count = status.count;
            }
        });

        orderStatusBreakdown.forEach(status => {
            status.percentage = totalOrders > 0 ? (status.count / totalOrders) * 100 : 0;
        });

        // Get user growth data (last 6 months)
        const userGrowth = [];
        try {
            for (let i = 5; i >= 0; i--) {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);

                const monthUsers = await User.countDocuments({ createdAt: { $gte: monthStart } });

                userGrowth.push({
                    month: monthStart.toLocaleString('default', { month: 'short' }),
                    users: monthUsers
                });
            }
        } catch (error) {
            console.log('Could not fetch user growth data');
            throw new Error('Failed to fetch user growth data');
        }

        // Get category performance (simplified - would need category data)
        const categoryPerformance = [
            { category: 'Medical Equipment', sales: 456, revenue: 45600 },
            { category: 'Personal Protective Equipment', sales: 389, revenue: 15560 },
            { category: 'Diagnostic Tools', sales: 234, revenue: 35100 },
            { category: 'Surgical Supplies', sales: 178, revenue: 14240 }
        ];

        const stats = {
            totalProducts,
            totalOrders,
            totalUsers,
            totalRevenue,
            pendingOrders,
            newUsers,
            lowStockProducts,
            monthlyRevenue,
            topProducts,
            orderStatusBreakdown,
            userGrowth,
            categoryPerformance
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

const initiatePayment = async (req, res) => {
    try {
        console.log('=== INITIATE PAYMENT STARTED ===');
        console.log('Request body:', JSON.stringify(req.body, null, 2));

        const { items, shippingAddress, totalAmount, paymentMethod } = req.body;
        const userId = req.user?.id || null; // Allow null for guest users

        console.log('User ID:', userId);

        // Validate required fields
        if (!items || !shippingAddress || !totalAmount) {
            console.error('Missing required fields:', { items: !!items, shippingAddress: !!shippingAddress, totalAmount: !!totalAmount });
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: items, shippingAddress, totalAmount'
            });
        }

        // Validate items array
        if (!Array.isArray(items) || items.length === 0) {
            console.error('Invalid items array:', items);
            return res.status(400).json({
                success: false,
                message: 'Items must be a non-empty array'
            });
        }

        // Validate shipping address
        const requiredAddressFields = ['fullName', 'email', 'phone', 'address', 'city', 'county', 'deliveryLocation'];
        for (const field of requiredAddressFields) {
            if (!shippingAddress[field]) {
                console.error(`Missing shipping address field: ${field}`);
                return res.status(400).json({
                    success: false,
                    message: `Missing shipping address field: ${field}`
                });
            }
        }

        // Generate unique order ID
        const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        console.log('Generated order ID:', orderId);

        // Check MongoDB connection
        if (mongoose.connection.readyState !== 1) {
            console.log('MongoDB not connected, using test database for payment initiation');
            // For test mode, return a mock payment URL
            return res.json({
                success: true,
                message: 'Payment initiated successfully (test mode)',
                paymentUrl: 'https://sandbox.pesapal.com/test-payment',
                orderId: orderId
            });
        }

        console.log('Creating order in database...');

        // Create the order first
        const order = new orderModel({
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
            user: userId, // Associate with user if logged in
            timeline: [{
                status: 'pending',
                changedAt: new Date(),
                note: 'Order created and payment initiated'
            }]
        });

        const savedOrder = await order.save();
        console.log('Order saved successfully:', savedOrder._id);

        console.log('Initiating PesaPal payment...');

        // Now initiate PesaPal payment
        const paymentResult = await initiatePesapalPayment(
            orderId,
            totalAmount,
            shippingAddress.phone,
            shippingAddress.email,
            `Order payment for ${orderId}`
        );

        console.log('PesaPal paymentResult:', paymentResult);

        if (!paymentResult || !paymentResult.paymentUrl) {
            console.error('No paymentUrl returned from PesaPal:', paymentResult);

            // Update order status to failed
            await orderModel.findByIdAndUpdate(savedOrder._id, {
                orderStatus: 'failed',
                paymentStatus: 'failed',
                timeline: [...savedOrder.timeline, {
                    status: 'failed',
                    changedAt: new Date(),
                    note: 'Payment initiation failed - no payment URL received'
                }]
            });

            return res.status(500).json({
                success: false,
                message: 'Failed to get payment URL from PesaPal',
                error: 'No paymentUrl returned'
            });
        }

        console.log('Payment initiated successfully, returning payment URL');

        res.json({
            success: true,
            message: 'Payment initiated successfully',
            paymentUrl: paymentResult.paymentUrl,
            orderId: orderId
        });

    } catch (error) {
        console.error('Payment initiation error:', error);
        console.error('Error stack:', error.stack);

        // Try to extract more specific error information
        let errorMessage = 'Failed to initiate payment';
        let errorDetails = error.message;

        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            errorMessage = 'Payment service is currently unavailable. Please try again later.';
        } else if (error.response?.status === 401) {
            errorMessage = 'Payment service authentication failed. Please contact support.';
        } else if (error.response?.status >= 500) {
            errorMessage = 'Payment service is experiencing issues. Please try again later.';
        }

        res.status(500).json({
            success: false,
            message: errorMessage,
            error: errorDetails
        });
    }
};

// Admin: Update order
const updateOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { orderStatus, paymentStatus, trackingNumber, transactionTrackingId, transactionStatus, note } = req.body;

        const order = await orderModel.findById(id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Update fields
        if (orderStatus) order.orderStatus = orderStatus;
        if (paymentStatus) order.paymentStatus = paymentStatus;
        if (trackingNumber) order.trackingNumber = trackingNumber;
        if (transactionTrackingId) order.transactionTrackingId = transactionTrackingId;
        if (transactionStatus) order.transactionStatus = transactionStatus;

        // Add timeline entry if status changed
        if (orderStatus || paymentStatus || note) {
            order.timeline.push({
                status: orderStatus || order.orderStatus,
                changedAt: new Date(),
                note: note || 'Order updated by admin'
            });
        }

        await order.save();

        res.json({ order });
    } catch (err) {
        console.error('Error updating order:', err);
        res.status(500).json({ message: 'Failed to update order' });
    }
};

// Admin dashboard stats endpoint
const getDashboardStats = async (req, res) => {
    try {
        // Check if MongoDB is connected, otherwise use test database
        if (mongoose.connection.readyState !== 1) {
            console.log('MongoDB not connected, using test database for dashboard stats');

            // Use test database for all stats
            const allOrders = await testDatabase.findOrders();
            const totalOrders = allOrders.length;
            const pendingOrders = allOrders.filter(order => order.orderStatus === 'pending').length;
            const totalRevenue = allOrders
                .filter(order => order.paymentStatus === 'paid')
                .reduce((sum, order) => sum + (order.totalAmount || 0), 0);

            const totalUsers = testDatabase.users.length;

            const allProducts = await testDatabase.findProducts();
            const totalProducts = allProducts.length;
            const lowStockProducts = allProducts.filter(product => product.countInStock < 10).length;

            // Get recent activity from test database
            const recentOrders = allOrders
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 10);

            const recentActivity = recentOrders.map(order => ({
                id: order._id,
                type: 'order',
                message: `New order #${order.orderNumber || order._id} from ${order.shippingAddress?.fullName || 'Customer'}`,
                timestamp: new Date(order.createdAt).toLocaleString()
            }));

            // Get alerts
            const alerts = [];
            if (pendingOrders > 0) {
                alerts.push({
                    id: 'pending-orders',
                    type: 'warning',
                    message: `${pendingOrders} orders pending approval`,
                    action: 'Review Orders'
                });
            }
            if (lowStockProducts > 0) {
                alerts.push({
                    id: 'low-stock',
                    type: 'warning',
                    message: `${lowStockProducts} products are low in stock`,
                    action: 'View Inventory'
                });
            }

            // Get new users this month (simulate from test data)
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);
            const newUsers = testDatabase.users.filter(user =>
                new Date(user.createdAt) >= startOfMonth
            ).length;

            const stats = {
                totalUsers,
                totalProducts,
                totalOrders,
                totalRevenue,
                pendingOrders,
                newUsers,
                recentActivity,
                alerts
            };

            return res.json(stats);
        }

        // Get total orders count
        const totalOrders = await orderModel.countDocuments();

        // Get pending orders count
        const pendingOrders = await orderModel.countDocuments({ orderStatus: 'pending' });

        // Get total revenue (paid orders only)
        const revenueResult = await orderModel.aggregate([
            { $match: { paymentStatus: 'paid' } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);
        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

        // Get user count (if User model is available)
        let totalUsers = 0;
        try {
            totalUsers = await User.countDocuments();
        } catch (error) {
            console.log('User model not available for analytics, using test database');
            // Use test database for users if MongoDB is not connected
            if (mongoose.connection.readyState !== 1) {
                totalUsers = testDatabase.users.length;
            }
        }

        // Get product count and low stock products
        let totalProducts = 0;
        let lowStockProducts = 0;
        try {
            totalProducts = await Product.countDocuments({ isActive: true });
            lowStockProducts = await Product.countDocuments({
                isActive: true,
                countInStock: { $lt: 10 }
            });
        } catch (error) {
            console.log('Product model not available for analytics, using test database');
            // Use test database for products if MongoDB is not connected
            if (mongoose.connection.readyState !== 1) {
                const allProducts = await testDatabase.findProducts();
                totalProducts = allProducts.length;
                lowStockProducts = allProducts.filter(product => product.countInStock < 10).length;
            }
        }

        // Get recent activity (last 10 orders)
        const recentOrders = await orderModel.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .select('orderNumber orderStatus paymentStatus totalAmount createdAt shippingAddress.fullName')
            .lean();

        const recentActivity = recentOrders.map(order => ({
            id: order._id.toString(),
            type: 'order',
            message: `New order #${order.orderNumber} from ${order.shippingAddress?.fullName || 'Customer'}`,
            timestamp: new Date(order.createdAt).toLocaleString()
        }));

        // Get alerts
        const alerts = [];
        if (pendingOrders > 0) {
            alerts.push({
                id: 'pending-orders',
                type: 'warning',
                message: `${pendingOrders} orders pending approval`,
                action: 'Review Orders'
            });
        }
        if (lowStockProducts > 0) {
            alerts.push({
                id: 'low-stock',
                type: 'warning',
                message: `${lowStockProducts} products are low in stock`,
                action: 'View Inventory'
            });
        }

        // Get new users this month
        let newUsers = 0;
        try {
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);
            newUsers = await User.countDocuments({ createdAt: { $gte: startOfMonth } });
        } catch (error) {
            console.log('Could not fetch new users count');
        }

        const stats = {
            totalUsers,
            totalProducts,
            totalOrders,
            totalRevenue,
            pendingOrders,
            newUsers,
            recentActivity,
            alerts
        };

        res.json(stats);
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard statistics',
            error: error.message
        });
    }
};

// Admin: Bulk delete orders
const bulkDeleteOrders = async (req, res) => {
    try {
        const { orderIds } = req.body;

        if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
            return res.status(400).json({ message: 'Order IDs array is required' });
        }

        // Check if MongoDB is connected, otherwise use test database
        if (mongoose.connection.readyState !== 1) {
            console.log('MongoDB not connected, using test database for bulk delete');
            const deletedCount = await testDatabase.bulkDeleteOrders(orderIds);
            return res.json({
                message: `Successfully deleted ${deletedCount} orders from test database`,
                deletedCount
            });
        }

        // Delete orders from MongoDB
        const result = await orderModel.deleteMany({ _id: { $in: orderIds } });

        res.json({
            message: `Successfully deleted ${result.deletedCount} orders`,
            deletedCount: result.deletedCount
        });
    } catch (err) {
        console.error('Bulk delete error:', err);
        res.status(500).json({ message: 'Failed to delete orders' });
    }
};

const orderController = {
    getAllOrders,
    createOrder,
    createCashOrder,
    getSpecificOrder,
    updateOrderStatus,
    updateOrder,
    bulkDeleteOrders,
    payMpesa,
    payAirtelMoney,
    createCheckOutSession,
    verifyOrder,
    calculateShippingFee,
    getOrderAnalytics,
    getDashboardStats,
    initiatePayment,
};

export default orderController;
