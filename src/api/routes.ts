import type { FastifyInstance } from 'fastify';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/',
    {
      schema: {
        tags: ['Health'],
        summary: 'Healthcheck simples da API',
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              service: { type: 'string' },
            },
          },
        },
      },
    },
    async () => ({
      status: 'ok',
      service: 'tourism-exchange-api',
    }),
  );

  app.get(
    '/quotes',
    {
      schema: {
        tags: ['Quotes'],
        summary: 'Consulta cotacoes de turismo por moeda/cidade/operacao',
        querystring: {
          type: 'object',
          required: ['currency', 'city', 'operation'],
          properties: {
            currency: {
              type: 'string',
              pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
              description:
                'Slug da moeda em minusculo, sem acento e com hifen quando necessario (ex: dolar-turismo, euro, libra).',
              examples: ['dolar-turismo', 'dolar-canadense', 'euro'],
            },
            city: {
              type: 'string',
              pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
              description:
                'Slug da cidade em minusculo, sem acento e separado por hifen (ex: sao-paulo, rio-de-janeiro, belo-horizonte).',
              examples: ['sao-paulo', 'rio-de-janeiro', 'belo-horizonte'],
            },
            operation: {
              type: 'string',
              enum: ['compra', 'venda'],
              description: 'Tipo de operacao de cambio',
            },
            productType: {
              type: 'string',
              enum: ['papel-moeda', 'cartao-prepago'],
              default: 'papel-moeda',
              description: 'Tipo de produto de cambio',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              query: {
                type: 'object',
                properties: {
                  currency: { type: 'string' },
                  city: { type: 'string' },
                  operation: { type: 'string' },
                  productType: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request) => {
      const query = request.query as {
        currency: string;
        city: string;
        operation: 'compra' | 'venda';
        productType?: 'papel-moeda' | 'cartao-prepago';
      };

      return {
        message: 'Endpoint documentado e pronto para integrar com cache/scraper.',
        query: {
          currency: query.currency,
          city: query.city,
          operation: query.operation,
          productType: query.productType ?? 'papel-moeda',
        },
      };
    },
  );
}
