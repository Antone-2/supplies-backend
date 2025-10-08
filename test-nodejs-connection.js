// Node.js MongoDB Connection Test - Exact Server Environment Simulation
require('dotenv').config();
const mongoose = require('mongoose');

console.log('='.repeat(60));
console.log('🔍 MONGODB CONNECTION DIAGNOSTIC - NODE.JS CONTEXT');
console.log('='.repeat(60));

// Test environment variable loading
console.log('\n📋 ENVIRONMENT VARIABLES:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('MONGO_URI exists:', !!process.env.MONGO_URI);
console.log('MONGO_URI format:', process.env.MONGO_URI ?
  process.env.MONGO_URI.replace(/:[^:@]*@/, ':***@') : 'NOT FOUND');

// Exact connection string from .env
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI not found in environment variables!');
  process.exit(1);
}

console.log('\n🔧 CONNECTION OPTIONS:');
const connectionOptions = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
  bufferCommands: false
};

console.log('Options:', JSON.stringify(connectionOptions, null, 2));

console.log('\n🚀 TESTING CONNECTION...');
console.log('Attempting to connect to MongoDB Atlas...');

async function testNodeJSConnection() {
  try {
    // Set mongoose debug to see exact queries
    mongoose.set('debug', true);

    console.log('⏳ Connecting...');
    const startTime = Date.now();

    await mongoose.connect(MONGO_URI, connectionOptions);

    const connectTime = Date.now() - startTime;
    console.log(`✅ SUCCESS! Connected in ${connectTime}ms`);

    // Test database operations
    console.log('\n📊 TESTING DATABASE OPERATIONS:');

    const db = mongoose.connection.db;
    console.log('Database name:', db.databaseName);

    // List collections
    const collections = await db.listCollections().toArray();
    console.log('Collections found:', collections.length);
    collections.forEach(col => console.log(`  - ${col.name}`));

    // Test a simple query
    const testCollection = db.collection('test');
    await testCollection.insertOne({ test: true, timestamp: new Date() });
    const testDoc = await testCollection.findOne({ test: true });
    console.log('Test document inserted and retrieved:', !!testDoc);

    // Clean up test document
    await testCollection.deleteOne({ test: true });

    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('MongoDB connection is working perfectly in Node.js context');

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ CONNECTION FAILED:');
    console.error('Error Type:', error.constructor.name);
    console.error('Error Message:', error.message);

    if (error.code) {
      console.error('Error Code:', error.code);
    }

    if (error.codeName) {
      console.error('Code Name:', error.codeName);
    }

    if (error.reason) {
      console.error('Reason:', error.reason);
    }

    // DNS specific errors
    if (error.message.includes('ENOTFOUND')) {
      console.error('\n🔍 DNS RESOLUTION ISSUE DETECTED:');
      console.error('The hostname cannot be resolved in Node.js context');
      console.error('This differs from Compass which may use different DNS resolution');

      // Try alternative DNS resolution
      console.log('\n🔧 TRYING ALTERNATIVE CONNECTION...');
      const dns = require('dns').promises;
      try {
        const resolved = await dns.lookup('medhelm.9lqul7l.mongodb.net');
        console.log('DNS lookup successful:', resolved);
      } catch (dnsError) {
        console.error('DNS lookup failed:', dnsError.message);
      }
    }

    // Network timeout errors
    if (error.message.includes('timeout')) {
      console.error('\n⏱️ TIMEOUT ISSUE DETECTED:');
      console.error('Network timeout - firewall or slow connection');
    }

    // Authentication errors
    if (error.message.includes('Authentication')) {
      console.error('\n🔐 AUTHENTICATION ISSUE DETECTED:');
      console.error('Check username/password in connection string');
    }

    process.exit(1);
  }
}

// Handle process signals
process.on('SIGINT', async () => {
  console.log('\n⏹️ Received SIGINT, closing connection...');
  await mongoose.connection.close();
  process.exit(0);
});

testNodeJSConnection();