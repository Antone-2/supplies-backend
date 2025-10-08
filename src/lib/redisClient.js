const redis = require('redis');

// Create a mock Redis client that doesn't fail on import
let client;

try {
    client = redis.createClient({ url: process.env.REDIS_URL });
    client.on('error', (err) => { }); // Suppress error logging

    // Connect to Redis asynchronously
    (async () => {
        try {
            await client.connect();
            console.log('Connected to Redis');
        } catch (err) {
            console.error('Failed to connect to Redis:', err.message);
            console.log('Server will continue without Redis caching');
            // Create a mock client that does nothing
            client = {
                get: async () => null,
                setEx: async () => null,
                del: async () => null,
                on: () => { }
            };
        }
    })();
} catch (err) {
    console.error('Failed to create Redis client:', err.message);
    console.log('Server will continue without Redis caching');
    // Create a mock client that does nothing
    client = {
        get: async () => null,
        setEx: async () => null,
        del: async () => null,
        on: () => { }
    };
}

module.exports = client;
