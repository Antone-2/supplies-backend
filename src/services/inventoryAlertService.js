import mongoose from 'mongoose';
import Product from '../../../Database/models/product.model.js';
import User from '../../../Database/models/user.model.js';
import { notifyLowStock } from './enhancedNotificationService.js';

// ============================================
// INVENTORY ALERT SERVICE
// ============================================

const DEFAULT_REORDER_LEVEL = 10;
const DEFAULT_REORDER_QUANTITY = 50;

// Get low stock products
const getLowStockProducts = async (threshold = null) => {
    try {
        const reorderLevel = threshold || DEFAULT_REORDER_LEVEL;

        const products = await Product.find({
            $expr: { $lte: ['$countInStock', reorderLevel] },
            isActive: true
        }).sort({ countInStock: 1 });

        return { success: true, products };
    } catch (error) {
        console.error('Error fetching low stock products:', error);
        return { success: false, error: error.message, products: [] };
    }
};

// Get out of stock products
const getOutOfStockProducts = async () => {
    try {
        const products = await Product.find({
            countInStock: { $lte: 0 },
            isActive: true
        }).sort({ name: 1 });

        return { success: true, products };
    } catch (error) {
        console.error('Error fetching out of stock products:', error);
        return { success: false, error: error.message, products: [] };
    }
};

// Check and alert for low stock
const checkLowStock = async (productId) => {
    try {
        const product = await Product.findById(productId);

        if (!product) {
            return { success: false, error: 'Product not found' };
        }

        const reorderLevel = product.reorderLevel || DEFAULT_REORDER_LEVEL;

        if (product.countInStock <= reorderLevel) {
            // Send low stock notification
            await notifyLowStock(product, product.countInStock);

            return {
                success: true,
                alert: true,
                product: {
                    id: product._id,
                    name: product.name,
                    countInStock: product.countInStock,
                    reorderLevel: reorderLevel
                }
            };
        }

        return { success: true, alert: false };
    } catch (error) {
        console.error('Error checking low stock:', error);
        return { success: false, error: error.message };
    }
};

// Update product stock and check alerts
const updateStock = async (productId, quantityChange) => {
    try {
        const product = await Product.findById(productId);

        if (!product) {
            return { success: false, error: 'Product not found' };
        }

        const previousStock = product.countInStock;
        product.countInStock += quantityChange;

        // Prevent negative stock
        if (product.countInStock < 0) {
            product.countInStock = 0;
        }

        await product.save();

        // Check if stock dropped below reorder level
        const reorderLevel = product.reorderLevel || DEFAULT_REORDER_LEVEL;
        const wasAboveThreshold = previousStock > reorderLevel;
        const isBelowThreshold = product.countInStock <= reorderLevel;

        if (wasAboveThreshold && isBelowThreshold) {
            // Send low stock alert
            await notifyLowStock(product, product.countInStock);
        }

        return {
            success: true,
            previousStock,
            currentStock: product.countInStock,
            alertTriggered: wasAboveThreshold && isBelowThreshold
        };
    } catch (error) {
        console.error('Error updating stock:', error);
        return { success: false, error: error.message };
    }
};

// Bulk check all products for low stock
const bulkCheckLowStock = async () => {
    try {
        const { products } = await getLowStockProducts();
        const checkedProducts = [];

        for (const product of products) {
            const reorderLevel = product.reorderLevel || DEFAULT_REORDER_LEVEL;

            if (product.countInStock <= reorderLevel) {
                await notifyLowStock(product, product.countInStock);
                checkedProducts.push({
                    id: product._id,
                    name: product.name,
                    countInStock: product.countInStock,
                    alertSent: true
                });
            }
        }

        return {
            success: true,
            checkedCount: products.length,
            alertsSent: checkedProducts.length,
            products: checkedProducts
        };
    } catch (error) {
        console.error('Error in bulk low stock check:', error);
        return { success: false, error: error.message };
    }
};

// Get inventory summary
const getInventorySummary = async () => {
    try {
        const [
            totalProducts,
            lowStockProducts,
            outOfStockProducts,
            totalStockValue
        ] = await Promise.all([
            Product.countDocuments({ isActive: true }),
            Product.countDocuments({
                $expr: { $lte: ['$countInStock', DEFAULT_REORDER_LEVEL] },
                isActive: true
            }),
            Product.countDocuments({
                countInStock: { $lte: 0 },
                isActive: true
            }),
            Product.aggregate([
                { $match: { isActive: true } },
                {
                    $group: {
                        _id: null,
                        totalValue: { $sum: { $multiply: ['$countInStock', '$price'] } },
                        totalItems: { $sum: '$countInStock' }
                    }
                }
            ])
        ]);

        return {
            success: true,
            summary: {
                totalProducts,
                lowStockProducts,
                outOfStockProducts,
                healthyStock: totalProducts - lowStockProducts,
                totalStockValue: totalStockValue[0]?.totalValue || 0,
                totalItems: totalStockValue[0]?.totalItems || 0
            }
        };
    } catch (error) {
        console.error('Error getting inventory summary:', error);
        return { success: false, error: error.message };
    }
};

// Get low stock report
const getLowStockReport = async () => {
    try {
        const [lowStock, outOfStock, categories] = await Promise.all([
            Product.find({
                $expr: { $lte: ['$countInStock', DEFAULT_REORDER_LEVEL] },
                isActive: true
            })
                .select('name sku price countInStock reorderLevel category')
                .sort({ countInStock: 1 })
                .lean(),

            Product.find({
                countInStock: { $lte: 0 },
                isActive: true
            })
                .select('name sku price countInStock category')
                .lean(),

            Product.aggregate([
                { $match: { isActive: true } },
                {
                    $group: {
                        _id: '$category',
                        lowStockCount: {
                            $sum: {
                                $cond: [{ $lte: ['$countInStock', DEFAULT_REORDER_LEVEL] }, 1, 0]
                            }
                        },
                        outOfStockCount: {
                            $sum: {
                                $cond: [{ $lte: ['$countInStock', 0] }, 1, 0]
                            }
                        }
                    }
                },
                { $match: { $or: [{ lowStockCount: { $gt: 0 } }, { outOfStockCount: { $gt: 0 } }] } }
            ])
        ]);

        return {
            success: true,
            report: {
                lowStock: {
                    count: lowStock.length,
                    products: lowStock
                },
                outOfStock: {
                    count: outOfStock.length,
                    products: outOfStock
                },
                byCategory: categories
            }
        };
    } catch (error) {
        console.error('Error generating low stock report:', error);
        return { success: false, error: error.message };
    }
};

export {
    DEFAULT_REORDER_LEVEL,
    DEFAULT_REORDER_QUANTITY,
    getLowStockProducts,
    getOutOfStockProducts,
    checkLowStock,
    updateStock,
    bulkCheckLowStock,
    getInventorySummary,
    getLowStockReport
};
