const express = require('express');
const router = express.Router();

// In-memory data stores (would be database in production)
let products = [
    { _id: '1', name: 'Surgical Gloves', description: 'High quality surgical gloves', price: 500, countInStock: 100, category: 'medical', brand: 'MedCare', image: '' },
    { _id: '2', name: 'Digital Thermometer', description: 'Fast reading digital thermometer', price: 1200, countInStock: 50, category: 'diagnostic', brand: 'HealthPro', image: '' },
    { _id: '3', name: 'First Aid Kit', description: 'Complete first aid kit for emergencies', price: 2500, countInStock: 25, category: 'emergency', brand: 'SafetyFirst', image: '' },
    { _id: '4', name: 'Blood Pressure Monitor', description: 'Automatic blood pressure monitor', price: 3500, countInStock: 0, category: 'diagnostic', brand: 'HealthPro', image: '' },
    { _id: '5', name: 'N95 Mask Pack', description: 'Pack of 50 N95 masks', price: 800, countInStock: 200, category: 'protective', brand: 'MedCare', image: '' },
    { _id: '6', name: 'Stethoscope', description: 'Professional stethoscope', price: 4500, countInStock: 15, category: 'diagnostic', brand: 'MedPro', image: '' },
    { _id: '7', name: 'Wheelchair', description: 'Lightweight foldable wheelchair', price: 15000, countInStock: 5, category: 'mobility', brand: 'MobilityPlus', image: '' },
    { _id: '8', name: 'Pill Organizer', description: 'Weekly pill organizer', price: 350, countInStock: 80, category: 'pharmacy', brand: 'PharmaCare', image: '' },
    { _id: '9', name: 'Oxygen Concentrator', description: 'Home oxygen concentrator', price: 45000, countInStock: 2, category: 'respiratory', brand: 'OxyMed', image: '' },
    { _id: '10', name: 'Bandage Rolls', description: 'Elastic bandage rolls', price: 200, countInStock: 150, category: 'emergency', brand: 'SafetyFirst', image: '' },
];

let orders = [
    { _id: 'ord001', orderNumber: 'ORD-2024-001', customer: { name: 'John Doe', email: 'john@example.com' }, total: 5000, status: 'delivered', createdAt: '2024-01-15' },
    { _id: 'ord002', orderNumber: 'ORD-2024-002', customer: { name: 'Jane Smith', email: 'jane@example.com' }, total: 3200, status: 'shipped', createdAt: '2024-01-16' },
    { _id: 'ord003', orderNumber: 'ORD-2024-003', customer: { name: 'Bob Wilson', email: 'bob@example.com' }, total: 8500, status: 'processing', createdAt: '2024-01-17' },
    { _id: 'ord004', orderNumber: 'ORD-2024-004', customer: { name: 'Alice Brown', email: 'alice@example.com' }, total: 1200, status: 'pending', createdAt: '2024-01-18' },
    { _id: 'ord005', orderNumber: 'ORD-2024-005', customer: { name: 'Charlie Davis', email: 'charlie@example.com' }, total: 6700, status: 'delivered', createdAt: '2024-01-19' },
    { _id: 'ord006', orderNumber: 'ORD-2024-006', customer: { name: 'Diana Evans', email: 'diana@example.com' }, total: 4100, status: 'cancelled', createdAt: '2024-01-20' },
    { _id: 'ord007', orderNumber: 'ORD-2024-007', customer: { name: 'Edward Foster', email: 'edward@example.com' }, total: 9300, status: 'shipped', createdAt: '2024-01-21' },
    { _id: 'ord008', orderNumber: 'ORD-2024-008', customer: { name: 'Fiona Green', email: 'fiona@example.com' }, total: 2800, status: 'processing', createdAt: '2024-01-22' },
    { _id: 'ord009', orderNumber: 'ORD-2024-009', customer: { name: 'George Harris', email: 'george@example.com' }, total: 15500, status: 'delivered', createdAt: '2024-01-23' },
    { _id: 'ord010', orderNumber: 'ORD-2024-010', customer: { name: 'Hannah Irving', email: 'hannah@example.com' }, total: 5400, status: 'pending', createdAt: '2024-01-24' },
];

let users = [
    { _id: 'usr001', name: 'John Doe', email: 'john@example.com', phone: '+254712345678', role: 'user', active: true, verified: true, createdAt: '2023-06-15' },
    { _id: 'usr002', name: 'Jane Smith', email: 'jane@example.com', phone: '+254712345679', role: 'admin', active: true, verified: true, createdAt: '2023-07-20' },
    { _id: 'usr003', name: 'Bob Wilson', email: 'bob@example.com', phone: '+254712345680', role: 'user', active: true, verified: false, createdAt: '2023-08-10' },
    { _id: 'usr004', name: 'Alice Brown', email: 'alice@example.com', phone: '+254712345681', role: 'user', active: true, verified: true, createdAt: '2023-09-05' },
    { _id: 'usr005', name: 'Charlie Davis', email: 'charlie@example.com', phone: '+254712345682', role: 'user', active: false, verified: true, createdAt: '2023-10-12' },
    { _id: 'usr006', name: 'Diana Evans', email: 'diana@example.com', phone: '+254712345683', role: 'super_admin', active: true, verified: true, createdAt: '2023-11-08' },
    { _id: 'usr007', name: 'Edward Foster', email: 'edward@example.com', phone: '+254712345684', role: 'user', active: true, verified: false, createdAt: '2023-12-01' },
    { _id: 'usr008', name: 'Fiona Green', email: 'fiona@example.com', phone: '+254712345685', role: 'admin', active: true, verified: true, createdAt: '2024-01-05' },
    { _id: 'usr009', name: 'George Harris', email: 'george@example.com', phone: '+254712345686', role: 'user', active: true, verified: true, createdAt: '2024-01-15' },
    { _id: 'usr010', name: 'Hannah Irving', email: 'hannah@example.com', phone: '+254712345687', role: 'user', active: false, verified: true, createdAt: '2024-01-25' },
];

// Search products
router.get('/products', (req, res) => {
    try {
        const { q } = req.query;

        if (!q) {
            return res.json({ results: [] });
        }

        const searchTerm = q.toLowerCase();
        const results = products.filter(product =>
            product.name.toLowerCase().includes(searchTerm) ||
            product.description.toLowerCase().includes(searchTerm) ||
            product.brand?.toLowerCase().includes(searchTerm) ||
            product.category?.toLowerCase().includes(searchTerm)
        ).slice(0, 20);

        res.json({ results, total: results.length });
    } catch (error) {
        console.error('Search products error:', error);
        res.status(500).json({ message: 'Server error searching products' });
    }
});

// Search orders
router.get('/orders', (req, res) => {
    try {
        const { q } = req.query;

        if (!q) {
            return res.json({ results: [] });
        }

        const searchTerm = q.toLowerCase();
        const results = orders.filter(order =>
            order.orderNumber?.toLowerCase().includes(searchTerm) ||
            order.customer?.name?.toLowerCase().includes(searchTerm) ||
            order.customer?.email?.toLowerCase().includes(searchTerm) ||
            order.status?.toLowerCase().includes(searchTerm)
        ).slice(0, 20);

        res.json({ results, total: results.length });
    } catch (error) {
        console.error('Search orders error:', error);
        res.status(500).json({ message: 'Server error searching orders' });
    }
});

// Search users
router.get('/users', (req, res) => {
    try {
        const { q } = req.query;

        if (!q) {
            return res.json({ results: [] });
        }

        const searchTerm = q.toLowerCase();
        const results = users.filter(user =>
            user.name?.toLowerCase().includes(searchTerm) ||
            user.email?.toLowerCase().includes(searchTerm) ||
            user.phone?.includes(searchTerm)
        ).slice(0, 20);

        res.json({ results, total: results.length });
    } catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({ message: 'Server error searching users' });
    }
});

// Combined search
router.get('/', (req, res) => {
    try {
        const { q, type } = req.query;

        if (!q) {
            return res.json({ results: [] });
        }

        const searchTerm = q.toLowerCase();
        let results = [];

        // Search based on type
        if (type === 'products' || !type) {
            const productResults = products.filter(product =>
                product.name.toLowerCase().includes(searchTerm) ||
                product.description.toLowerCase().includes(searchTerm) ||
                product.brand?.toLowerCase().includes(searchTerm)
            ).slice(0, 10).map(p => ({ ...p, type: 'product' }));
            results = [...results, ...productResults];
        }

        if (type === 'orders' || !type) {
            const orderResults = orders.filter(order =>
                order.orderNumber?.toLowerCase().includes(searchTerm) ||
                order.customer?.name?.toLowerCase().includes(searchTerm)
            ).slice(0, 10).map(o => ({ ...o, type: 'order' }));
            results = [...results, ...orderResults];
        }

        if (type === 'users' || !type) {
            const userResults = users.filter(user =>
                user.name?.toLowerCase().includes(searchTerm) ||
                user.email?.toLowerCase().includes(searchTerm)
            ).slice(0, 10).map(u => ({ ...u, type: 'user' }));
            results = [...results, ...userResults];
        }

        res.json({ results, total: results.length });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ message: 'Server error performing search' });
    }
});

module.exports = router;
