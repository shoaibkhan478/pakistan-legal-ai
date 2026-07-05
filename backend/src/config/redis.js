/**
 * Redis Configuration
 * Used for session caching, rate limiting, chat sessions
 */

const { createClient } = require('redis');
const logger = require('../utils/logger');

let redisClient = null;

async function connectRedis() {
  redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD || undefined,
  });

  redisClient.on('error', (err) => logger.error('Redis error:', err));
  redisClient.on('reconnecting', () => logger.warn('Redis reconnecting...'));

  // await redisClient.connect();
  logger.info('Redis client connected');
  return redisClient;
}

function getRedis() {
  return redisClient;
}

async function setCache(key, value, ttlSeconds = 3600) {
  if (!redisClient) return false;
  try {
    await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
    return true;
  } catch (err) {
    logger.error('Redis set error:', err);
    return false;
  }
}

async function getCache(key) {
  if (!redisClient) return null;
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    logger.error('Redis get error:', err);
    return null;
  }
}

async function deleteCache(key) {
  if (!redisClient) return false;
  try {
    await redisClient.del(key);
    return true;
  } catch (err) {
    logger.error('Redis del error:', err);
    return false;
  }
}

async function deleteCachePattern(pattern) {
  if (!redisClient) return false;
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) await redisClient.del(keys);
    return true;
  } catch (err) {
    logger.error('Redis del pattern error:', err);
    return false;
  }
}

module.exports = { connectRedis, getRedis, setCache, getCache, deleteCache, deleteCachePattern };
