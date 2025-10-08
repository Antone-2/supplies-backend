// deleteAllUsers.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./Database/models/user.model');

async function deleteAllUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    const result = await User.deleteMany({});
    console.log(`Deleted ${result.deletedCount} users.`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error deleting users:', err);
    process.exit(1);
  }
}

deleteAllUsers();
