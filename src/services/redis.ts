import Redis from 'ioredis';
import { env } from '../config/env.js';

let redisInstance: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisInstance) {
    if (env.REDIS_URL) {
      redisInstance = new Redis(env.REDIS_URL, {
        maxRetriesPerRequest: 3,
      });
    } else {
      redisInstance = new Redis({
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
        maxRetriesPerRequest: 3,
      });
    }
  }

  return redisInstance;
}

export async function closeRedisClient(): Promise<void> {
  if (!redisInstance) {
    return;
  }

  await redisInstance.quit();
  redisInstance = null;
}
