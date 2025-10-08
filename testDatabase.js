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
            }
        ];
        this.users = [];
        this.products = [
            { _id: 6, id: 6, name: "Stethoscope", price: 45.99, category: "Medical Equipment" },
            { _id: 7, id: 7, name: "Blood Pressure Monitor", price: 120.00, category: "Medical Equipment" },
            { _id: 8, id: 8, name: "Thermometer", price: 25.50, category: "Medical Equipment" }
        ];
        this.nextOrderId = 1000;
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
}

module.exports = new TestDatabase();