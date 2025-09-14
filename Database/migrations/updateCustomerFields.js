const mongoose = require('mongoose');
const User = require('../models/user.model');
require('dotenv').config({ path: '../../.env' });

async function updateExistingUsers() {
    try {
        const MONGO_URI = process.env.MONGO_URI;
        await mongoose.connect(MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        console.log('Connected to MongoDB');

        // Update existing users to have default values for new fields
        const result = await User.updateMany(
            {
                $or: [
                    { role: { $exists: false } },
                    { isActive: { $exists: false } },
                    { loyaltyPoints: { $exists: false } }
                ]
            },
            {
                $set: {
                    role: 'customer',
                    isActive: true,
                    loyaltyPoints: 0
                }
            }
        );

        console.log(`Updated ${result.modifiedCount} existing users with default values`);

        // Optional: Add some sample customer data for testing
        const sampleCustomer = await User.findOneAndUpdate(
            { email: 'customer@example.com' },
            {
                phone: '+1-555-0123',
                address: {
                    street: '123 Main St',
                    city: 'Anytown',
                    state: 'CA',
                    zipCode: '12345',
                    country: 'USA'
                },
                gender: 'male',
                loyaltyPoints: 100,
                preferredPaymentMethod: 'credit_card'
            },
            { upsert: true, new: true }
        );

        if (sampleCustomer) {
            console.log('Sample customer created/updated:', sampleCustomer.email);
        }

        console.log('Migration completed successfully');
        process.exit(0);

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

// Run migration if this file is executed directly
if (require.main === module) {
    updateExistingUsers();
}

module.exports = { updateExistingUsers };