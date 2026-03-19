import Fastify, { type FastifyInstance } from 'fastify';
import { registerRoutes } from '../../api/routes.js';
import { registerGlobalErrorHandler } from '../../errors/error-handler.js';
import type { ExchangeScrapeResult } from '../../scraper/types.js';

const BASE_RESULT: ExchangeScrapeResult = {
  sourceUrl: 'https://www.melhorcambio.com/cotacao/compra/dolar-turismo/sao-paulo',
  fetchedAt: '2026-03-19T00:00:00.000Z',
  currencyName: 'Dólar',
  cityName: 'São Paulo',
  operation: 'compra',
  productType: 'papel-moeda',
  quotes: [
    {
      name: 'Casa C',
      quoteValue: 5.65,
      partnerRecommended: false,
      rating: 3.1,
      operationsLast60Days: 10,
      companyType: 'Corretora',
      legalName: 'CASA C LTDA',
      bacenCode: '333',
      address: null,
      businessHours: null,
      notes: null,
    },
    {
      name: 'Casa A',
      quoteValue: 5.59,
      partnerRecommended: true,
      rating: 4.5,
      operationsLast60Days: 80,
      companyType: 'Corretora',
      legalName: 'CASA A LTDA',
      bacenCode: '111',
      address: null,
      businessHours: null,
      notes: null,
    },
    {
      name: 'Casa B',
      quoteValue: 5.60,
      partnerRecommended: false,
      rating: 4.0,
      operationsLast60Days: 60,
      companyType: 'Corretora',
      legalName: 'CASA B LTDA',
      bacenCode: '222',
      address: null,
      businessHours: null,
      notes: null,
    },
  ],
};

async function buildApp(getQuotes: jest.Mock): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  registerGlobalErrorHandler(app);
  await registerRoutes(app, {
    quotesProvider: {
      getQuotes,
    },
  });
  await app.ready();
  return app;
}

describe('GET /quotes integration', () => {
  it('returns paginated and sorted quotes by quoteValue asc by default', async () => {
    const getQuotes = jest.fn().mockResolvedValue({
      data: BASE_RESULT,
      meta: {
        source: 'cache',
        stale: false,
      },
    });

    const app = await buildApp(getQuotes);

    const response = await app.inject({
      method: 'GET',
      url: '/quotes?currency=dolar-turismo&city=sao-paulo&operation=compra&page=1&limit=2',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();

    expect(body.data.quotes.map((quote: { name: string }) => quote.name)).toEqual(['Casa A', 'Casa B']);
    expect(body.pagination).toMatchObject({
      page: 1,
      limit: 2,
      totalItems: 3,
      totalPages: 2,
      hasNextPage: true,
      hasPreviousPage: false,
    });

    await app.close();
  });

  it('returns quotes sorted by rating desc', async () => {
    const getQuotes = jest.fn().mockResolvedValue({
      data: BASE_RESULT,
      meta: {
        source: 'scraper',
        stale: false,
      },
    });

    const app = await buildApp(getQuotes);

    const response = await app.inject({
      method: 'GET',
      url: '/quotes?currency=dolar-turismo&city=sao-paulo&operation=compra&sortBy=rating&sortOrder=desc&limit=3',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();

    expect(body.data.quotes.map((quote: { name: string }) => quote.name)).toEqual(['Casa A', 'Casa B', 'Casa C']);
    await app.close();
  });

  it('maps upstream timeout to a descriptive 503 error', async () => {
    const getQuotes = jest.fn().mockRejectedValue(new Error('timeout of 20000ms exceeded'));
    const app = await buildApp(getQuotes);

    const response = await app.inject({
      method: 'GET',
      url: '/quotes?currency=dolar-turismo&city=sao-paulo&operation=compra',
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({
      statusCode: 503,
      code: 'UPSTREAM_TIMEOUT',
      error: 'Request Error',
    });

    await app.close();
  });

  it('returns standardized validation error for invalid query params', async () => {
    const getQuotes = jest.fn().mockResolvedValue({
      data: BASE_RESULT,
      meta: {
        source: 'cache',
        stale: false,
      },
    });

    const app = await buildApp(getQuotes);

    const response = await app.inject({
      method: 'GET',
      url: '/quotes?currency=dolar-turismo&city=são-paulo&operation=compra',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      error: 'Request Error',
    });

    await app.close();
  });

  it('includes stale warning when provider returns stale cache data', async () => {
    const getQuotes = jest.fn().mockResolvedValue({
      data: BASE_RESULT,
      meta: {
        source: 'cache',
        stale: true,
        staleReason: 'upstream_unavailable',
      },
    });

    const app = await buildApp(getQuotes);

    const response = await app.inject({
      method: 'GET',
      url: '/quotes?currency=dolar-turismo&city=sao-paulo&operation=compra',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      warnings: [
        {
          code: 'STALE_DATA',
        },
      ],
    });

    await app.close();
  });
});
