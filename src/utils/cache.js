let Redis;
let redis;
function getClient() {
  if (!process.env.REDIS_URL) {
    // Caching disabled (no Redis URL)
    return null;
  }
  if (!Redis) {
    try {
      Redis = require('ioredis');
    } catch (e) {
      return null; // ioredis not installed or failed to load
    }
  }
  if (!redis) {
    const url = process.env.REDIS_URL;
    redis = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 2 });
  }
  return redis;
}

async function get(key) {
  try {
    const client = getClient();
    if (!client) return null;
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    return null; // Silent fail (avoid taking down request path)
  }
}

async function set(key, value, ttlSeconds = 60) {
  try {
    const client = getClient();
    if (!client) return;
    await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (err) {
    // ignore cache write failures
  }
}

async function del(pattern) {
  try {
    const client = getClient();
    if (!client) return;
    if (pattern.includes('*')) {
      const keys = await client.keys(pattern);
      if (keys.length) await client.del(keys);
    } else {
      await client.del(pattern);
    }
  } catch (err) { }
}

module.exports = { get, set, del };