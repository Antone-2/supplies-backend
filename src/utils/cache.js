const Redis = require('ioredis');

let redis;
function getClient() {
  if (!redis) {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    redis = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 2 });
  }
  return redis;
}

async function get(key) {
  try {
    const client = getClient();
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    return null; // Silent fail (avoid taking down request path)
  }
}

async function set(key, value, ttlSeconds = 60) {
  try {
    const client = getClient();
    await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (err) {
    // ignore cache write failures
  }
}

async function del(pattern) {
  try {
    const client = getClient();
    if (pattern.includes('*')) {
      const keys = await client.keys(pattern);
      if (keys.length) await client.del(keys);
    } else {
      await client.del(pattern);
    }
  } catch (err) { }
}

module.exports = { get, set, del };