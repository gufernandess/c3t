import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { env } from './config/env.js';
import { registerRoutes } from './api/routes.js';
import { registerGlobalErrorHandler } from './errors/error-handler.js';
import { closeRedisClient } from './services/redis.js';
import { startQuotesRefreshWorker } from './worker/quotes-refresh.js';

const fastify = Fastify({ logger: true });

await fastify.register(swagger, {
  openapi: {
    info: {
      title: 'Tourism Exchange API',
      description: 'API para consulta de cotações de câmbio turismo',
      version: '1.0.0',
    },
    tags: [{ name: 'Health' }, { name: 'Quotes' }],
  },
});

await fastify.register(swaggerUi, {
  routePrefix: '/docs',
});

registerGlobalErrorHandler(fastify);
await registerRoutes(fastify);
startQuotesRefreshWorker();

fastify.addHook('onClose', async () => {
  await closeRedisClient();
});

const start = async () => {
  try {
    await fastify.listen({ port: env.PORT, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
