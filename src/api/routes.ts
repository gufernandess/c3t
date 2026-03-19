import type { FastifyInstance } from 'fastify';
import { mapQuotesProviderError, normalizeProductType, QuotesProvider } from '../services/quotes-provider.js';
import { normalizeLimit, normalizePage, normalizeSortBy, normalizeSortOrder, paginateQuotes, sortQuotes } from '../utils/quotes-query.js';

interface RegisterRoutesDeps {
  quotesProvider?: Pick<QuotesProvider, 'getQuotes'>;
}

export async function registerRoutes(app: FastifyInstance, deps?: RegisterRoutesDeps): Promise<void> {
  const quotesProvider = deps?.quotesProvider ?? new QuotesProvider();

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
      service: 'c3t-api',
    }),
  );

  app.get(
    '/quotes',
    {
      schema: {
        tags: ['Quotes'],
        summary: 'Consulta cotações de turismo por moeda/cidade/operação',
        querystring: {
          type: 'object',
          required: ['currency', 'city', 'operation'],
          properties: {
            currency: {
              type: 'string',
              pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
              description:
                'Slug da moeda em minúsculo, sem acento e com hífen quando necessário (ex: dolar-turismo, euro, libra).',
              examples: ['dolar-turismo', 'dolar-canadense', 'euro'],
            },
            city: {
              type: 'string',
              pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
              description:
                'Slug da cidade em minúsculo, sem acento e separado por hífen (ex: sao-paulo, rio-de-janeiro, belo-horizonte).',
              examples: ['sao-paulo', 'rio-de-janeiro', 'belo-horizonte'],
            },
            operation: {
              type: 'string',
              enum: ['compra', 'venda'],
              description: 'Tipo de operação de câmbio',
            },
            productType: {
              type: 'string',
              enum: ['papel-moeda', 'cartao-prepago'],
              default: 'papel-moeda',
              description: 'Tipo de produto de câmbio',
            },
            page: {
              type: 'integer',
              minimum: 1,
              default: 1,
              description: 'Página atual para retorno da lista de casas de câmbio.',
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 10,
              description: 'Quantidade de itens por página (máximo 100).',
            },
            sortBy: {
              type: 'string',
              enum: ['quoteValue', 'rating'],
              default: 'quoteValue',
              description: 'Campo usado para ordenação da lista.',
            },
            sortOrder: {
              type: 'string',
              enum: ['asc', 'desc'],
              default: 'asc',
              description: 'Direção da ordenação.',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  fetchedAt: { type: 'string' },
                  currencyName: { type: 'string' },
                  cityName: { type: 'string' },
                  operation: { type: 'string' },
                  productType: { type: 'string' },
                  quotes: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        quoteValue: { type: 'number' },
                        partnerRecommended: { type: 'boolean' },
                        rating: { type: ['number', 'null'] },
                        operationsLast60Days: { type: ['number', 'null'] },
                        companyType: { type: ['string', 'null'] },
                        legalName: { type: ['string', 'null'] },
                        bacenCode: { type: ['string', 'null'] },
                        address: { type: ['string', 'null'] },
                        businessHours: { type: ['string', 'null'] },
                        notes: { type: ['string', 'null'] },
                      },
                    },
                  },
                },
              },
              pagination: {
                type: 'object',
                properties: {
                  page: { type: 'integer' },
                  limit: { type: 'integer' },
                  totalItems: { type: 'integer' },
                  totalPages: { type: 'integer' },
                  hasNextPage: { type: 'boolean' },
                  hasPreviousPage: { type: 'boolean' },
                },
              },
              warnings: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    code: { type: 'string' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
          400: {
            description: 'Erro de validação dos parâmetros enviados.',
            type: 'object',
            properties: {
              statusCode: { type: 'integer' },
              code: { type: 'string' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
          502: {
            description: 'Falha ao consultar ou processar dados da fonte externa.',
            type: 'object',
            properties: {
              statusCode: { type: 'integer' },
              code: { type: 'string' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
          503: {
            description: 'Tempo limite excedido na consulta da fonte externa.',
            type: 'object',
            properties: {
              statusCode: { type: 'integer' },
              code: { type: 'string' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
          500: {
            description: 'Erro interno inesperado no servidor.',
            type: 'object',
            properties: {
              statusCode: { type: 'integer' },
              code: { type: 'string' },
              error: { type: 'string' },
              message: { type: 'string' },
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
        page?: number;
        limit?: number;
        sortBy?: 'quoteValue' | 'rating';
        sortOrder?: 'asc' | 'desc';
      };

      const productType = normalizeProductType(query.productType);
      const page = normalizePage(query.page);
      const limit = normalizeLimit(query.limit);
      const sortBy = normalizeSortBy(query.sortBy);
      const sortOrder = normalizeSortOrder(query.sortOrder);

      let result: Awaited<ReturnType<typeof quotesProvider.getQuotes>>;

      try {
        result = await quotesProvider.getQuotes({
          currency: query.currency,
          city: query.city,
          operation: query.operation,
          productType,
        });
      } catch (error) {
        throw mapQuotesProviderError(error);
      }

      const sortedQuotes = sortQuotes(result.data.quotes, sortBy, sortOrder);
      const paginated = paginateQuotes(sortedQuotes, page, limit);

      const currentPage = Math.min(page, paginated.totalPages);

      return {
        data: {
          fetchedAt: result.data.fetchedAt,
          currencyName: result.data.currencyName,
          cityName: result.data.cityName,
          operation: result.data.operation,
          productType: result.data.productType,
          quotes: paginated.items,
        },
        pagination: {
          page: currentPage,
          limit,
          totalItems: paginated.total,
          totalPages: paginated.totalPages,
          hasNextPage: currentPage < paginated.totalPages,
          hasPreviousPage: currentPage > 1,
        },
        warnings: result.meta.stale
          ? [
              {
                code: 'STALE_DATA',
                message: 'Os dados exibidos podem estar desatualizados devido à indisponibilidade temporária da fonte externa.',
              },
            ]
          : [],
      };
    },
  );
}
