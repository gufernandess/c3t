import 'dotenv/config';

const DEFAULT_BASE_URL = 'https://www.melhorcambio.com';

export const env = {
  PORT: Number.parseInt(process.env.PORT ?? '3000', 10),
  REDIS_URL: process.env.REDIS_URL,
  REDIS_HOST: process.env.REDIS_HOST ?? 'localhost',
  REDIS_PORT: Number.parseInt(process.env.REDIS_PORT ?? '6379', 10),
  MELHOR_CAMBIO_BASE_URL: process.env.MELHOR_CAMBIO_BASE_URL ?? DEFAULT_BASE_URL,
  CACHE_TTL_SECONDS: Number.parseInt(process.env.CACHE_TTL_SECONDS ?? '2100', 10),
  QUOTE_REFRESH_CRON: process.env.QUOTE_REFRESH_CRON ?? '*/30 * * * *',
};
