import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { env } from './config/env.js';
import { registerRoutes } from './api/routes.js';

const fastify = Fastify({ logger: true });

await fastify.register(swagger, {
  openapi: {
    info: {
      title: 'Tourism Exchange API',
      description: 'API para consulta de cotacoes de cambio turismo',
      version: '1.0.0',
    },
    tags: [{ name: 'Health' }, { name: 'Quotes' }],
  },
});

await fastify.register(swaggerUi, {
  routePrefix: '/docs',
});

await registerRoutes(fastify);

const start = async () => {
  try {
    await fastify.listen({ port: env.PORT, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
