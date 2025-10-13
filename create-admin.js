import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import User from './Database/models/user.model.js';
import config from './config/environment.js';

async function createAdminUser() {
    try {
        // Connect to MongoDB
        await mongoose.connect(config.MONGO_URI);
        console.log('Connected to MongoDB');

        // Check if admin user already exists
        const existingAdmin = await User.findOne({ email: 'info@medhelmsupplies.co.ke' });
        if (existingAdmin) {
            console.log('Admin user already exists:', existingAdmin);
            // Update password if needed
            const hashedPassword = await bcrypt.hash('Texas99$', 10);
            existingAdmin.password = hashedPassword;
            existingAdmin.role = 'admin';
            await existingAdmin.save();
            console.log('Admin user updated with new password');
        } else {
            // Create new admin user
            const hashedPassword = await bcrypt.hash('Texas99$', 10);
            const adminUser = new User({
                name: 'Admin User',
                email: 'info@medhelmsupplies.co.ke',
                password: hashedPassword,
                role: 'admin',
                isVerified: true
            });
            await adminUser.save();
            console.log('Admin user created successfully');
        }

        await mongoose.connection.close();
        console.log('Database connection closed');
    } catch (error) {
        console.error('Error creating admin user:', error);
        process.exit(1);
    }
}

createAdminUser();
