import mongoose from 'mongoose';
import User from './Database/models/user.model.js';
import config from './config/environment.js';

async function listUsers() {
    try {

        await mongoose.connect(config.MONGO_URI);
        console.log(' Connected to MongoDB');


        const users = await User.find({}).select('-password').lean();

        console.log(`\n Total Users Found: ${users.length}\n`);

        if (users.length === 0) {
            console.log(' No users found in database');
        } else {
            console.log(' Users in Database:');
            console.log('='.repeat(80));

            users.forEach((user, index) => {
                console.log(`${index + 1}. ${user.name || 'No Name'}`);
                console.log(`   Email: ${user.email}`);
                console.log(`   Role: ${user.role || 'user'}`);
                console.log(`   Active: ${user.active !== false ? 'Yes' : 'No'}`);
                console.log(`   Verified: ${user.isVerified || user.verified ? 'Yes' : 'No'}`);
                console.log(`   Created: ${user.createdAt ? new Date(user.createdAt).toLocaleString() : 'Unknown'}`);
                console.log(`   Last Login: ${user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}`);
                console.log(`   ID: ${user._id}`);
                console.log('-'.repeat(40));
            });
        }

        await mongoose.connection.close();
        console.log(' Database connection closed');
    } catch (error) {
        console.error(' Error listing users:', error);
        process.exit(1);
    }
}

listUsers();