import express from 'express';
import mongoose from 'mongoose';
import Order from '../Database/models/order.model.js';
import { generateInvoicePDF, generateInvoiceHTML } from '../services/invoiceService.js';
import { sendEmail, getEmailTemplate } from '../services/emailService.js';
import { sendSMS } from '../services/smsService.js';
import jwtAuthMiddleware from '../middleware/jwtAuthMiddleware.js';
import admin from '../middleware/admin.js';

const router = express.Router();


router.get('/order/:id/pdf', jwtAuthMiddleware, async (req, res) => {
    try {
        const orderId = req.params.id;

        if (mongoose.Types.ObjectId.isValid(orderId)) {
            var order = await Order.findById(orderId);
        }

        if (!order) {
            order = await Order.findOne({ orderNumber: orderId });
        }

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        const isOwner = order.user?.toString() === req.user?.id;
        const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const pdfBuffer = await generateInvoicePDF(order);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.orderNumber}.pdf`);
        res.send(pdfBuffer);

    } catch (error) {
        console.error('PDF generation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate PDF',
            error: error.message
        });
    }
});

router.get('/order/:id/html', jwtAuthMiddleware, async (req, res) => {
    try {
        const orderId = req.params.id;

        let order;
        if (mongoose.Types.ObjectId.isValid(orderId)) {
            order = await Order.findById(orderId);
        }

        if (!order) {
            order = await Order.findOne({ orderNumber: orderId });
        }

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        const isOwner = order.user?.toString() === req.user?.id;
        const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const html = generateInvoiceHTML(order);

        res.setHeader('Content-Type', 'text/html');
        res.send(html);

    } catch (error) {
        console.error('HTML generation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate HTML invoice',
            error: error.message
        });
    }
});
router.post('/order/:id/email', jwtAuthMiddleware, admin, async (req, res) => {
    try {
        const orderId = req.params.id;
        const { email } = req.body;

        let order;
        if (mongoose.Types.ObjectId.isValid(orderId)) {
            order = await Order.findById(orderId);
        }

        if (!order) {
            order = await Order.findOne({ orderNumber: orderId });
        }

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        const recipientEmail = email || order.shippingAddress?.email;

        if (!recipientEmail) {
            return res.status(400).json({
                success: false,
                message: 'Email address required'
            });
        }

        const pdfBuffer = await generateInvoicePDF(order);
        const html = generateInvoiceHTML(order);

        const emailResult = await sendEmail(
            recipientEmail,
            `Invoice - ${order.orderNumber}`,
            html,
            pdfBuffer,
            `invoice-${order.orderNumber}.pdf`
        );
        if (order.shippingAddress?.phone) {
            let phoneNumber = order.shippingAddress.phone;
            if (phoneNumber.startsWith('0')) {
                phoneNumber = '+254' + phoneNumber.substring(1);
            }

            await sendSMS(phoneNumber, `Your invoice for order ${order.orderNumber} has been sent to ${recipientEmail}. - Medhelm Supplies`);
        }

        res.json({
            success: true,
            message: 'Invoice sent successfully',
            email: emailResult
        });

    } catch (error) {
        console.error('Email invoice error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to email invoice',
            error: error.message
        });
    }
});

export default router;
