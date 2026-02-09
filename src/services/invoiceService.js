import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// INVOICE GENERATION SERVICE
// ============================================

const generateInvoicePDF = async (order, options = {}) => {
    return new Promise(async (resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margin: 50,
                bufferPages: true
            });

            const chunks = [];
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // Company Info
            const companyInfo = {
                name: process.env.COMPANY_NAME || 'Medhelm Supplies',
                address: process.env.COMPANY_ADDRESS || 'Nairobi, Kenya',
                phone: process.env.COMPANY_PHONE || '+254 XXX XXX XXX',
                email: process.env.COMPANY_EMAIL || 'info@medhelmsupplies.co.ke',
                website: process.env.FRONTEND_URL || 'https://medhelmsupplies.co.ke'
            };

            // Header
            doc.fontSize(24).font('Helvetica-Bold').fillColor('#2c5aa0');
            doc.text(companyInfo.name, 50, 50, { align: 'left' });

            doc.fontSize(10).font('Helvetica').fillColor('#666666');
            doc.text(companyInfo.address, 50, 80);
            doc.text(`Phone: ${companyInfo.phone}`, 50, 95);
            doc.text(companyInfo.email, 50, 110);
            doc.text(companyInfo.website, 50, 125);

            // Invoice Title
            doc.fontSize(28).font('Helvetica-Bold').fillColor('#333333');
            doc.text('INVOICE', 400, 50, { align: 'right' });

            doc.fontSize(10).font('Helvetica').fillColor('#666666');
            doc.text(`Invoice #: INV-${order.orderNumber}`, 400, 80, { align: 'right' });
            doc.text(`Date: ${new Date().toLocaleDateString('en-KE')}`, 400, 95, { align: 'right' });
            doc.text(`Due Date: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-KE')}`, 400, 110, { align: 'right' });

            // Bill To
            doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333');
            doc.text('Bill To:', 50, 170);

            doc.font('Helvetica').fillColor('#666666');
            doc.fontSize(10);
            doc.text(order.shippingAddress?.fullName || 'Customer', 50, 185);
            doc.text(order.shippingAddress?.address || '', 50, 200);
            doc.text(`${order.shippingAddress?.city || ''}, ${order.shippingAddress?.county || ''}`, 50, 215);
            doc.text(order.shippingAddress?.phone || '', 50, 230);
            doc.text(order.shippingAddress?.email || '', 50, 245);

            // Ship To (if different)
            if (order.shippingAddress?.address !== order.billingAddress?.address) {
                doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333');
                doc.text('Ship To:', 350, 170);

                doc.font('Helvetica').fillColor('#666666');
                doc.fontSize(10);
                doc.text(order.shippingAddress?.fullName || 'Customer', 350, 185);
                doc.text(order.shippingAddress?.address || '', 350, 200);
                doc.text(`${order.shippingAddress?.city || ''}, ${order.shippingAddress?.county || ''}`, 350, 215);
            }

            // Order Info
            const orderInfoY = 300;
            doc.fontSize(10).fillColor('#333333');
            doc.text(`Order Number: ${order.orderNumber}`, 50, orderInfoY);
            doc.text(`Payment Status: ${order.paymentStatus?.toUpperCase() || 'PENDING'}`, 50, orderInfoY + 15);
            doc.text(`Payment Method: ${order.paymentMethod?.toUpperCase() || 'PESAPAL'}`, 50, orderInfoY + 30);
            doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString('en-KE')}`, 50, orderInfoY + 45);

            if (order.trackingNumber) {
                doc.text(`Tracking Number: ${order.trackingNumber}`, 50, orderInfoY + 60);
            }

            // Items Table Header
            const tableTop = 400;
            const tableHeaders = ['Item', 'Quantity', 'Unit Price', 'Total'];
            const colWidths = [250, 80, 100, 100];
            const tableLeft = 50;

            // Table Header Background
            doc.rect(tableLeft, tableTop - 10, 530, 25).fill('#2c5aa0');

            doc.fontSize(10).font('Helvetica-Bold').fillColor('#FFFFFF');
            let xPos = tableLeft + 5;
            tableHeaders.forEach((header, i) => {
                doc.text(header, xPos, tableTop - 5);
                xPos += colWidths[i];
            });

            // Table Rows
            let yPos = tableTop + 25;
            doc.font('Helvetica').fillColor('#333333');

            let subtotal = 0;
            const items = order.items || [];

            items.forEach((item, index) => {
                const itemTotal = (item.price || 0) * (item.quantity || 0);
                subtotal += itemTotal;

                if (index % 2 === 0) {
                    doc.rect(tableLeft, yPos - 5, 530, 25).fill('#f9f9f9');
                }

                doc.fontSize(9).fillColor('#333333');
                xPos = tableLeft + 5;
                doc.text(item.name?.substring(0, 40) || 'Product', xPos, yPos);
                xPos += colWidths[0];
                doc.text(item.quantity?.toString() || '1', xPos, yPos);
                xPos += colWidths[1];
                doc.text(`KES ${(item.price || 0).toLocaleString()}`, xPos, yPos);
                xPos += colWidths[2];
                doc.text(`KES ${itemTotal.toLocaleString()}`, xPos, yPos);

                yPos += 25;
            });

            // Totals
            yPos += 20;

            // Line
            doc.moveTo(350, yPos).lineTo(580, yPos).stroke('#cccccc');
            yPos += 15;

            const shippingFee = order.shippingFee || 0;
            const tax = order.tax || 0;
            const total = subtotal + shippingFee + tax;

            doc.fontSize(10).font('Helvetica');
            doc.text('Subtotal:', 400, yPos);
            doc.text(`KES ${subtotal.toLocaleString()}`, 480, yPos, { align: 'right', width: 90 });
            yPos += 20;

            doc.text('Shipping:', 400, yPos);
            doc.text(`KES ${shippingFee.toLocaleString()}`, 480, yPos, { align: 'right', width: 90 });
            yPos += 20;

            if (tax > 0) {
                doc.text('Tax:', 400, yPos);
                doc.text(`KES ${tax.toLocaleString()}`, 480, yPos, { align: 'right', width: 90 });
                yPos += 20;
            }

            // Total Line
            doc.moveTo(350, yPos).lineTo(580, yPos).stroke('#2c5aa0');
            yPos += 15;

            doc.fontSize(14).font('Helvetica-Bold').fillColor('#2c5aa0');
            doc.text('TOTAL:', 350, yPos);
            doc.text(`KES ${total.toLocaleString()}`, 480, yPos, { align: 'right', width: 90 });

            // Payment Info
            yPos += 60;
            doc.fontSize(10).font('Helvetica-Bold').fillColor('#333333');
            doc.text('Payment Information:', 50, yPos);
            yPos += 20;
            doc.font('Helvetica').fillColor('#666666');
            doc.fontSize(9);
            doc.text(`Transaction ID: ${order.transactionTrackingId || 'N/A'}`, 50, yPos);
            yPos += 15;
            doc.text(`Transaction Status: ${order.transactionStatus || 'Pending'}`, 50, yPos);
            yPos += 15;
            doc.text(`Paid At: ${order.paidAt ? new Date(order.paidAt).toLocaleString() : 'Not Paid'}`, 50, yPos);

            // Footer
            const pageHeight = doc.page.height;
            doc.fontSize(8).fillColor('#999999');
            doc.text('Thank you for your business!', 50, pageHeight - 80, { align: 'center', width: 500 });
            doc.text(`This invoice was generated on ${new Date().toLocaleString()}`, 50, pageHeight - 65, { align: 'center', width: 500 });
            doc.text('Terms: Payment due within 30 days', 50, pageHeight - 50, { align: 'center', width: 500 });
            doc.text(`${companyInfo.name} | ${companyInfo.email} | ${companyInfo.phone}`, 50, pageHeight - 35, { align: 'center', width: 500 });

            // Finalize
            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};

const generateInvoiceHTML = (order) => {
    const companyInfo = {
        name: process.env.COMPANY_NAME || 'Medhelm Supplies',
        address: process.env.COMPANY_ADDRESS || 'Nairobi, Kenya',
        phone: process.env.COMPANY_PHONE || '+254 XXX XXX XXX',
        email: process.env.COMPANY_EMAIL || 'info@medhelmsupplies.co.ke'
    };

    const itemsHtml = (order.items || []).map(item => {
        const total = (item.price || 0) * (item.quantity || 0);
        return `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name || 'Product'}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity || 1}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">KES ${(item.price || 0).toLocaleString()}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">KES ${total.toLocaleString()}</td>
            </tr>
        `;
    }).join('');

    const subtotal = (order.items || []).reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0);
    const shippingFee = order.shippingFee || 0;
    const tax = order.tax || 0;
    const total = subtotal + shippingFee + tax;

    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Invoice - ${order.orderNumber}</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background: #f5f5f5; }
                .invoice-container { max-width: 800px; margin: 0 auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #2c5aa0, #1a3a6e); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
                .header h1 { margin: 0; font-size: 28px; }
                .company-info { font-size: 14px; margin-top: 10px; }
                .content { padding: 30px; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th { background: #2c5aa0; color: white; padding: 12px; text-align: left; }
                td { padding: 10px; border-bottom: 1px solid #eee; }
                .totals { margin-left: auto; width: 300px; }
                .totals td { padding: 8px; }
                .total-row { font-weight: bold; font-size: 18px; color: #2c5aa0; }
                .footer { background: #333; color: white; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; }
                @media print {
                    body { background: #fff; }
                    .invoice-container { box-shadow: none; }
                }
            </style>
        </head>
        <body>
            <div class="invoice-container">
                <div class="header">
                    <h1>${companyInfo.name}</h1>
                    <div class="company-info">
                        <p>${companyInfo.address} | ${companyInfo.phone} | ${companyInfo.email}</p>
                    </div>
                </div>
                <div class="content">
                    <h2 style="color: #2c5aa0;">INVOICE</h2>
                    <p><strong>Invoice #:</strong> INV-${order.orderNumber}</p>
                    <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-KE')}</p>
                    <p><strong>Due Date:</strong> ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-KE')}</p>
                    
                    <h3>Bill To:</h3>
                    <p>
                        ${order.shippingAddress?.fullName || 'Customer'}<br>
                        ${order.shippingAddress?.address || ''}<br>
                        ${order.shippingAddress?.city || ''}, ${order.shippingAddress?.county || ''}<br>
                        ${order.shippingAddress?.phone || ''}<br>
                        ${order.shippingAddress?.email || ''}
                    </p>

                    <table>
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th style="text-align: center;">Quantity</th>
                                <th style="text-align: right;">Unit Price</th>
                                <th style="text-align: right;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>

                    <table class="totals">
                        <tr>
                            <td>Subtotal:</td>
                            <td style="text-align: right;">KES ${subtotal.toLocaleString()}</td>
                        </tr>
                        <tr>
                            <td>Shipping:</td>
                            <td style="text-align: right;">KES ${shippingFee.toLocaleString()}</td>
                        </tr>
                        ${tax > 0 ? `
                        <tr>
                            <td>Tax:</td>
                            <td style="text-align: right;">KES ${tax.toLocaleString()}</td>
                        </tr>
                        ` : ''}
                        <tr class="total-row">
                            <td>TOTAL:</td>
                            <td style="text-align: right;">KES ${total.toLocaleString()}</td>
                        </tr>
                    </table>

                    <h3>Payment Information:</h3>
                    <p>
                        <strong>Transaction ID:</strong> ${order.transactionTrackingId || 'N/A'}<br>
                        <strong>Status:</strong> ${order.paymentStatus?.toUpperCase() || 'PENDING'}
                    </p>
                </div>
                <div class="footer">
                    <p>Thank you for your business!</p>
                    <p>${companyInfo.name} | ${companyInfo.email} | ${companyInfo.phone}</p>
                </div>
            </div>
        </body>
        </html>
    `;
};

export { generateInvoicePDF, generateInvoiceHTML };
