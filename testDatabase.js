// Simple in-memory database for testing purposes
class TestDatabase {
    constructor() {
        this.orders = [
            {
                _id: 'MH-2025-001',
                orderNumber: 'MH-2025-001',
                orderStatus: 'shipped',
                paymentStatus: 'paid',
                totalAmount: 150.50,
                createdAt: new Date('2025-01-15T10:30:00Z'),
                updatedAt: new Date('2025-01-17T14:20:00Z'),
                timeline: [
                    {
                        status: 'pending',
                        changedAt: new Date('2025-01-15T10:30:00Z'),
                        note: 'Order placed successfully'
                    },
                    {
                        status: 'processing',
                        changedAt: new Date('2025-01-15T16:45:00Z'),
                        note: 'Payment confirmed, preparing items'
                    },
                    {
                        status: 'shipped',
                        changedAt: new Date('2025-01-17T09:15:00Z'),
                        note: 'Package dispatched via courier'
                    }
                ],
                shippingAddress: {
                    fullName: 'John Doe',
                    city: 'Nairobi',
                    county: 'Nairobi County',
                    deliveryLocation: 'CBD - GPO'
                },
                items: [
                    { name: 'Stethoscope', quantity: 1, price: 45.99 },
                    { name: 'Blood Pressure Monitor', quantity: 1, price: 104.51 }
                ]
            },
            {
                _id: 'MH-2025-002',
                orderNumber: 'MH-2025-002',
                orderStatus: 'processing',
                paymentStatus: 'pending',
                totalAmount: 75.25,
                createdAt: new Date('2025-01-18T14:20:00Z'),
                updatedAt: new Date('2025-01-18T14:20:00Z'),
                timeline: [
                    {
                        status: 'pending',
                        changedAt: new Date('2025-01-18T14:20:00Z'),
                        note: 'Order received, awaiting payment'
                    }
                ],
                shippingAddress: {
                    fullName: 'Jane Smith',
                    city: 'Mombasa',
                    county: 'Mombasa County',
                    deliveryLocation: 'Nyali - Shopping Center'
                },
                items: [
                    { name: 'Thermometer', quantity: 2, price: 25.50 },
                    { name: 'Medical Mask (Pack)', quantity: 1, price: 24.25 }
                ]
            },
            {
                _id: 'MH-2025-003',
                orderNumber: 'MH-2025-003',
                orderStatus: 'completed',
                paymentStatus: 'paid',
                totalAmount: 320.75,
                createdAt: new Date('2025-01-10T09:15:00Z'),
                updatedAt: new Date('2025-01-12T16:30:00Z'),
                timeline: [
                    {
                        status: 'pending',
                        changedAt: new Date('2025-01-10T09:15:00Z'),
                        note: 'Order placed successfully'
                    },
                    {
                        status: 'processing',
                        changedAt: new Date('2025-01-10T14:20:00Z'),
                        note: 'Payment confirmed, preparing items'
                    },
                    {
                        status: 'shipped',
                        changedAt: new Date('2025-01-11T11:45:00Z'),
                        note: 'Package dispatched via courier'
                    },
                    {
                        status: 'completed',
                        changedAt: new Date('2025-01-12T16:30:00Z'),
                        note: 'Order delivered successfully'
                    }
                ],
                shippingAddress: {
                    fullName: 'Dr. Michael Johnson',
                    city: 'Kisumu',
                    county: 'Kisumu County',
                    deliveryLocation: 'Mega City Mall'
                },
                items: [
                    { name: 'Surgical Gloves (Box)', quantity: 2, price: 85.50 },
                    { name: 'Face Shield', quantity: 3, price: 45.25 },
                    { name: 'Medical Gown', quantity: 1, price: 104.50 }
                ]
            },
            {
                _id: 'MH-2025-004',
                orderNumber: 'MH-2025-004',
                orderStatus: 'pending',
                paymentStatus: 'paid',
                totalAmount: 95.00,
                createdAt: new Date('2025-01-20T13:45:00Z'),
                updatedAt: new Date('2025-01-20T13:45:00Z'),
                timeline: [
                    {
                        status: 'pending',
                        changedAt: new Date('2025-01-20T13:45:00Z'),
                        note: 'Order placed and payment confirmed'
                    }
                ],
                shippingAddress: {
                    fullName: 'Sarah Wanjiku',
                    city: 'Nakuru',
                    county: 'Nakuru County',
                    deliveryLocation: 'Westlands'
                },
                items: [
                    { name: 'Digital Thermometer', quantity: 1, price: 35.00 },
                    { name: 'Blood Pressure Cuff', quantity: 1, price: 60.00 }
                ]
            },
            {
                _id: 'MH-2025-005',
                orderNumber: 'MH-2025-005',
                orderStatus: 'cancelled',
                paymentStatus: 'refunded',
                totalAmount: 180.25,
                createdAt: new Date('2025-01-05T16:20:00Z'),
                updatedAt: new Date('2025-01-06T10:15:00Z'),
                timeline: [
                    {
                        status: 'pending',
                        changedAt: new Date('2025-01-05T16:20:00Z'),
                        note: 'Order placed successfully'
                    },
                    {
                        status: 'cancelled',
                        changedAt: new Date('2025-01-06T10:15:00Z'),
                        note: 'Order cancelled by customer - item out of stock'
                    }
                ],
                shippingAddress: {
                    fullName: 'Prof. Grace Oduya',
                    city: 'Eldoret',
                    county: 'Uasin Gishu County',
                    deliveryLocation: 'Moi University'
                },
                items: [
                    { name: 'Otoscope', quantity: 1, price: 125.25 },
                    { name: 'Tongue Depressor Set', quantity: 1, price: 55.00 }
                ]
            }
        ];
        this.users = [
            {
                _id: 'user_001',
                name: 'John Doe',
                email: 'john.doe@example.com',
                role: 'customer',
                createdAt: new Date('2024-12-01T10:00:00Z'),
                isActive: true
            },
            {
                _id: 'user_002',
                name: 'Jane Smith',
                email: 'jane.smith@example.com',
                role: 'customer',
                createdAt: new Date('2024-12-15T14:30:00Z'),
                isActive: true
            },
            {
                _id: 'user_003',
                name: 'Dr. Michael Johnson',
                email: 'dr.johnson@hospital.com',
                role: 'customer',
                createdAt: new Date('2024-11-20T09:15:00Z'),
                isActive: true
            },
            {
                _id: 'user_004',
                name: 'Sarah Wanjiku',
                email: 'sarah.wanjiku@gmail.com',
                role: 'customer',
                createdAt: new Date('2025-01-01T16:45:00Z'),
                isActive: true
            },
            {
                _id: 'user_005',
                name: 'Prof. Grace Oduya',
                email: 'prof.oduya@university.edu',
                role: 'customer',
                createdAt: new Date('2024-10-10T11:20:00Z'),
                isActive: true
            },
            {
                _id: 'user_006',
                name: 'Admin User',
                email: 'admin@medhelmsupplies.co.ke',
                role: 'admin',
                createdAt: new Date('2024-09-01T08:00:00Z'),
                isActive: true
            }
        ];
        this.products = [
            { _id: 6, id: 6, name: "Stethoscope", price: 45.99, category: "Medical Equipment", countInStock: 25, isActive: true },
            { _id: 7, id: 7, name: "Blood Pressure Monitor", price: 120.00, category: "Medical Equipment", countInStock: 15, isActive: true },
            { _id: 8, id: 8, name: "Thermometer", price: 25.50, category: "Medical Equipment", countInStock: 8, isActive: true },
            { _id: 9, id: 9, name: "Surgical Gloves (Box)", price: 85.50, category: "Personal Protective Equipment", countInStock: 50, isActive: true },
            { _id: 10, id: 10, name: "Face Shield", price: 45.25, category: "Personal Protective Equipment", countInStock: 30, isActive: true },
            { _id: 11, id: 11, name: "Medical Gown", price: 104.50, category: "Personal Protective Equipment", countInStock: 20, isActive: true },
            { _id: 12, id: 12, name: "Digital Thermometer", price: 35.00, category: "Diagnostic Tools", countInStock: 12, isActive: true },
            { _id: 13, id: 13, name: "Blood Pressure Cuff", price: 60.00, category: "Medical Equipment", countInStock: 18, isActive: true },
            { _id: 14, id: 14, name: "Otoscope", price: 125.25, category: "Diagnostic Tools", countInStock: 5, isActive: true },
            { _id: 15, id: 15, name: "Tongue Depressor Set", price: 55.00, category: "Surgical Supplies", countInStock: 40, isActive: true },
            { _id: 16, id: 16, name: "Medical Mask (Pack)", price: 24.25, category: "Personal Protective Equipment", countInStock: 6, isActive: true }
        ];
        this.categories = [
            {
                _id: 'cat_001',
                name: 'Medical Equipment',
                description: 'Essential medical diagnostic and monitoring equipment',
                isActive: true,
                createdAt: new Date('2024-09-01T08:00:00Z'),
                updatedAt: new Date('2024-09-01T08:00:00Z')
            },
            {
                _id: 'cat_002',
                name: 'Personal Protective Equipment',
                description: 'PPE for healthcare professionals and patients',
                isActive: true,
                createdAt: new Date('2024-09-01T08:00:00Z'),
                updatedAt: new Date('2024-09-01T08:00:00Z')
            },
            {
                _id: 'cat_003',
                name: 'Diagnostic Tools',
                description: 'Tools and devices for medical diagnosis',
                isActive: true,
                createdAt: new Date('2024-09-01T08:00:00Z'),
                updatedAt: new Date('2024-09-01T08:00:00Z')
            },
            {
                _id: 'cat_004',
                name: 'Surgical Supplies',
                description: 'Supplies and instruments for surgical procedures',
                isActive: true,
                createdAt: new Date('2024-09-01T08:00:00Z'),
                updatedAt: new Date('2024-09-01T08:00:00Z')
            }
        ];
        this.nextOrderId = 1000;
        this.nextProductId = 17;
        this.nextUserId = 'user_007';
        this.nextCategoryId = 'cat_005';
    }

    // Order operations
    async createOrder(orderData) {
        const order = {
            _id: this.nextOrderId++,
            orderNumber: `MED${Date.now()}`,
            ...orderData,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        this.orders.push(order);
        return order;
    }

    async findOrder(orderIdOrQuery) {
        // If it's a string, search by ID directly
        if (typeof orderIdOrQuery === 'string') {
            return this.orders.find(order => order._id === orderIdOrQuery || order.orderNumber === orderIdOrQuery);
        }

        // If it's an object, use as query
        const query = orderIdOrQuery;
        return this.orders.find(order => {
            return Object.keys(query).every(key => order[key] === query[key]);
        });
    }

    async findOrders(query = {}) {
        return this.orders.filter(order => {
            return Object.keys(query).every(key => order[key] === query[key]);
        });
    }

    // User operations
    async createUser(userData) {
        const user = {
            _id: Date.now(),
            ...userData,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        this.users.push(user);
        return user;
    }

    async findUser(query) {
        return this.users.find(user => {
            return Object.keys(query).every(key => user[key] === query[key]);
        });
    }

    // Product operations
    async findProducts(query = {}) {
        return this.products.filter(product => {
            return Object.keys(query).every(key => product[key] === query[key]);
        });
    }

    async findProduct(query) {
        return this.products.find(product => {
            return Object.keys(query).every(key => product[key] === query[key]);
        });
    }

    // Category operations
    async findCategories(query = {}) {
        return this.categories.filter(category => {
            return Object.keys(query).every(key => category[key] === query[key]);
        });
    }

    async findCategory(query) {
        return this.categories.find(category => {
            return Object.keys(query).every(key => category[key] === query[key]);
        });
    }

    async createCategory(categoryData) {
        const category = {
            _id: this.nextCategoryId++,
            ...categoryData,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        this.categories.push(category);
        return category;
    }

    async updateCategory(id, updateData) {
        const categoryIndex = this.categories.findIndex(cat => cat._id === id);
        if (categoryIndex !== -1) {
            this.categories[categoryIndex] = {
                ...this.categories[categoryIndex],
                ...updateData,
                updatedAt: new Date()
            };
            return this.categories[categoryIndex];
        }
        return null;
    }

    async deleteCategory(id) {
        const categoryIndex = this.categories.findIndex(cat => cat._id === id);
        if (categoryIndex !== -1) {
            return this.categories.splice(categoryIndex, 1)[0];
        }
        return null;
    }

    // Admin CRUD operations for orders
    async updateOrder(id, updateData) {
        const orderIndex = this.orders.findIndex(order => order._id === id || order.orderNumber === id);
        if (orderIndex !== -1) {
            this.orders[orderIndex] = {
                ...this.orders[orderIndex],
                ...updateData,
                updatedAt: new Date()
            };
            return this.orders[orderIndex];
        }
        return null;
    }

    async deleteOrder(id) {
        const orderIndex = this.orders.findIndex(order => order._id === id || order.orderNumber === id);
        if (orderIndex !== -1) {
            return this.orders.splice(orderIndex, 1)[0];
        }
        return null;
    }

    // Admin CRUD operations for users
    async updateUser(id, updateData) {
        const userIndex = this.users.findIndex(user => user._id === id);
        if (userIndex !== -1) {
            this.users[userIndex] = {
                ...this.users[userIndex],
                ...updateData,
                updatedAt: new Date()
            };
            return this.users[userIndex];
        }
        return null;
    }

    async deleteUser(id) {
        const userIndex = this.users.findIndex(user => user._id === id);
        if (userIndex !== -1) {
            return this.users.splice(userIndex, 1)[0];
        }
        return null;
    }

    // Admin CRUD operations for products
    async createProduct(productData) {
        const product = {
            _id: this.nextProductId++,
            id: this.nextProductId - 1,
            ...productData,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        this.products.push(product);
        return product;
    }

    async updateProduct(id, updateData) {
        const productIndex = this.products.findIndex(product => product._id === id || product.id === id);
        if (productIndex !== -1) {
            this.products[productIndex] = {
                ...this.products[productIndex],
                ...updateData,
                updatedAt: new Date()
            };
            return this.products[productIndex];
        }
        return null;
    }

    async deleteProduct(id) {
        const productIndex = this.products.findIndex(product => product._id === id || product.id === id);
        if (productIndex !== -1) {
            return this.products.splice(productIndex, 1)[0];
        }
        return null;
    }
}

export default new TestDatabase();
