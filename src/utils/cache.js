let Redis;
let redis;
function getClient() {

}

async function get(key) {

}

async function set(key, value, ttlSeconds = 60) {
  try {
    const client = getClient();
    if (!client) return;
    await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (err) {

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