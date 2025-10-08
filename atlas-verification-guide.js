// MongoDB Atlas Cluster Verification Guide
// This script will help you find the correct connection string

console.log('🔍 MongoDB Atlas Connection String Verification Guide');
console.log('='.repeat(60));
console.log();

console.log('📋 Current connection string in your .env file:');
console.log('   medhelm.9lqul7l.mongodb.net');
console.log();

console.log('🌐 To get the correct connection string:');
console.log('1. Go to https://cloud.mongodb.com');
console.log('2. Login to your MongoDB Atlas account');
console.log('3. Click on "Database" in the left sidebar');
console.log('4. Look for your cluster (should show "Active" status)');
console.log('5. Click "Connect" button on your cluster');
console.log('6. Choose "Connect your application"');
console.log('7. Select "Node.js" and version "4.1 or later"');
console.log('8. Copy the connection string');
console.log();

console.log('✅ The correct connection string should look like:');
console.log('   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/<database>');
console.log();

console.log('⚠️  Common issues to check:');
console.log('• Cluster might be paused (free tier limitation)');
console.log('• Cluster URL might have changed');
console.log('• Database might be deleted');
console.log('• Wrong project/organization selected');
console.log();

console.log('🚫 Network Access Issues:');
console.log('• In Atlas dashboard, go to "Network Access"');
console.log('• Ensure 0.0.0.0/0 is in the IP Access List (you mentioned this is already set)');
console.log('• Check if there are any other IP restrictions');
console.log();

console.log('👤 Database User Issues:');
console.log('• Go to "Database Access" in Atlas');
console.log('• Verify user "medhelm_supplies" exists');
console.log('• Check user has "Read and write to any database" permissions');
console.log('• Verify password is correct (try resetting it)');
console.log();

console.log('🔧 Quick DNS Test:');
console.log('Run this command in PowerShell to test DNS resolution:');
console.log('   nslookup medhelm.9lqul7l.mongodb.net');
console.log();

console.log('🛠️  Alternative solutions:');
console.log('1. Use a different DNS server (8.8.8.8, 1.1.1.1)');
console.log('2. Try connecting from a different network');
console.log('3. Use MongoDB Compass to test the connection string');
console.log('4. Create a new cluster if the current one is corrupted');
console.log();

console.log('📝 After getting the correct connection string:');
console.log('1. Update your .env file with the new MONGO_URI');
console.log('2. Run: node diagnose-mongodb.js (to test again)');
console.log('3. If DNS still fails, we can set up a local MongoDB for testing');

console.log();
console.log('='.repeat(60));

// Test alternative DNS resolution
const dns = require('dns');

console.log('🧪 Testing DNS resolution with different servers...');

const dnsServers = [
    { name: 'System Default', servers: undefined },
    { name: 'Google DNS', servers: ['8.8.8.8', '8.8.4.4'] },
    { name: 'Cloudflare DNS', servers: ['1.1.1.1', '1.0.0.1'] }
];

async function testDNS() {
    const hostname = 'medhelm.9lqul7l.mongodb.net';

    for (const dnsConfig of dnsServers) {
        try {
            console.log(`\n🔍 Testing with ${dnsConfig.name}...`);

            if (dnsConfig.servers) {
                dns.setServers(dnsConfig.servers);
            }

            const { promisify } = require('util');
            const lookup = promisify(dns.lookup);

            const result = await lookup(hostname);
            console.log(`✅ ${dnsConfig.name}: Resolved to ${result.address}`);
        } catch (error) {
            console.log(`❌ ${dnsConfig.name}: ${error.message}`);
        }
    }

    console.log('\n🎯 If any DNS server works, update your system DNS settings');
    console.log('   Windows: Network Settings > Change Adapter Options > Properties > IPv4 Properties');
}