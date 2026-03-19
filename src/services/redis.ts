import Redis from 'ioredis';
import { env } from '../config/env.js';

let redisInstance: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisInstance) {
    redisInstance = new Redis({
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      maxRetriesPerRequest: 3,
    });
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
