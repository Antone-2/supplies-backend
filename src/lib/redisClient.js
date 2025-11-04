import redis from 'redis';

// Create a mock Redis client that doesn't fail on import
let client;

try {
    client = redis.createClient({
        url: process.env.REDIS_URL,
        socket: {
            connectTimeout: 5000, // 5 second timeout
            lazyConnect: true
        }
    });
    client.on('error', (err) => {
        console.warn('Redis connection error:', err.message);
    });

    // Connect to Redis asynchronously
    (async () => {
        try {
            await client.connect();
            console.log('✅ Connected to Redis successfully');
        } catch (err) {
            console.warn('Failed to connect to Redis:', err.message);
            console.log('Server will continue without Redis caching - products will load from database only');
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
    console.warn('Failed to create Redis client:', err.message);
    console.log('Server will continue without Redis caching - products will load from database only');
    // Create a mock client that does nothing
    client = {
        get: async () => null,
        setEx: async () => null,
        del: async () => null,
        on: () => { }
    };
}

export default client;
