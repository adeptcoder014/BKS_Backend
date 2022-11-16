import redis from 'redis';

export const client = redis.createClient({
  url: process.env.REDIS_URI,
});

export const getKey = async (key, json = false) => {
  const value = await client.get(key);
  if (!value) return null;

  if (json) return JSON.parse(value);
  return value;
};

export const storeKey = async (key, value, ttl) => {
  value = typeof value === 'object' ? JSON.stringify(value) : value;

  const res = await client.set(key, value, {
    EX: ttl,
  });

  return res;
};

export const deleteKey = async (key) => {
  await client.del(key);
};

export default client;
