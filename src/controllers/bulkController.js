const Product = require('../../Database/models/product.model');
const User = require('../../Database/models/user.model');
const Order = require('../../Database/models/order.model');
const csv = require('fast-csv');
const fs = require('fs');

// Bulk export products to CSV
exports.exportProducts = async (req, res) => {
    const products = await Product.find();
    const ws = fs.createWriteStream('products_export.csv');
    csv.write(products.map(p => p.toObject()), { headers: true }).pipe(ws);
    ws.on('finish', () => {
        res.download('products_export.csv');
    });
};

// Bulk import products from CSV
exports.importProducts = async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'CSV file required' });
    const products = [];
    fs.createReadStream(req.file.path)
        .pipe(csv.parse({ headers: true }))
        .on('data', row => products.push(row))
        .on('end', async () => {
            await Product.insertMany(products);
            res.json({ message: 'Products imported', count: products.length });
        });
};

// Bulk export users to CSV
exports.exportUsers = async (req, res) => {
    const users = await User.find();
    const ws = fs.createWriteStream('users_export.csv');
    csv.write(users.map(u => u.toObject()), { headers: true }).pipe(ws);
    ws.on('finish', () => {
        res.download('users_export.csv');
    });
};

// Bulk import users from CSV
exports.importUsers = async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'CSV file required' });
    const users = [];
    fs.createReadStream(req.file.path)
        .pipe(csv.parse({ headers: true }))
        .on('data', row => users.push(row))
        .on('end', async () => {
            await User.insertMany(users);
            res.json({ message: 'Users imported', count: users.length });
        });
};

// Bulk export orders to CSV
exports.exportOrders = async (req, res) => {
    const orders = await Order.find();
    const ws = fs.createWriteStream('orders_export.csv');
    csv.write(orders.map(o => o.toObject()), { headers: true }).pipe(ws);
    ws.on('finish', () => {
        res.download('orders_export.csv');
    });
};

// Bulk import orders from CSV
exports.importOrders = async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'CSV file required' });
    const orders = [];
    fs.createReadStream(req.file.path)
        .pipe(csv.parse({ headers: true }))
        .on('data', row => orders.push(row))
        .on('end', async () => {
            await Order.insertMany(orders);
            res.json({ message: 'Orders imported', count: orders.length });
        });
};
