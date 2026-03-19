import { QuotesProvider } from '../../services/quotes-provider.js';
import type { ExchangeScrapeResult } from '../../scraper/types.js';
import type { QuoteQuery } from '../../services/quotes-cache.js';

const QUERY: QuoteQuery = {
  currency: 'dolar-turismo',
  city: 'sao-paulo',
  operation: 'compra',
  productType: 'papel-moeda',
};

const PAYLOAD: ExchangeScrapeResult = {
  sourceUrl: 'https://www.melhorcambio.com/cotacao/compra/dolar-turismo/sao-paulo',
  fetchedAt: '2026-03-19T00:00:00.000Z',
  currencyName: 'Dólar',
  cityName: 'São Paulo',
  operation: 'compra',
  productType: 'papel-moeda',
  quotes: [
    {
      name: 'Casa A',
      quoteValue: 5.5,
      partnerRecommended: true,
      rating: 4.5,
      operationsLast60Days: 100,
      companyType: 'Corretora de Câmbio',
      legalName: 'CASA A LTDA.',
      bacenCode: '12345',
      address: 'Av. Paulista',
      businessHours: 'Seg/Sex - 9h as 18h',
      notes: 'Sem observacoes',
    },
  ],
};

describe('QuotesProvider', () => {
  it('returns cached payload when cache hit exists', async () => {
    const cache = {
      get: jest.fn().mockResolvedValue(PAYLOAD),
      getEntry: jest.fn(),
      set: jest.fn(),
      getTrackedQueries: jest.fn().mockResolvedValue([]),
    };

    const scraper = {
      scrape: jest.fn(),
    };

    const provider = new QuotesProvider({
      cache: cache as never,
      scraper,
    });

    const result = await provider.getQuotes(QUERY);

    expect(result.meta).toEqual({ source: 'cache', stale: false });
    expect(result.data).toEqual(PAYLOAD);
    expect(scraper.scrape).not.toHaveBeenCalled();
  });

  it('scrapes and stores payload when cache miss happens', async () => {
    const cache = {
      get: jest.fn().mockResolvedValue(null),
      getEntry: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      getTrackedQueries: jest.fn().mockResolvedValue([]),
    };

    const scraper = {
      scrape: jest.fn().mockResolvedValue(PAYLOAD),
    };

    const provider = new QuotesProvider({
      cache: cache as never,
      scraper,
    });

    const result = await provider.getQuotes(QUERY);

    expect(result.meta).toEqual({ source: 'scraper', stale: false });
    expect(scraper.scrape).toHaveBeenCalledWith(
      {
        currencySlug: 'dolar-turismo',
        citySlug: 'sao-paulo',
        operation: 'compra',
      },
      'papel-moeda',
    );
    expect(cache.set).toHaveBeenCalledWith(QUERY, PAYLOAD);
  });

  it('returns stale cached payload when upstream fails and stale data exists', async () => {
    const cache = {
      get: jest.fn().mockResolvedValue(null),
      getEntry: jest.fn().mockResolvedValue({
        payload: PAYLOAD,
        cachedAt: '2026-03-19T01:00:00.000Z',
      }),
      set: jest.fn().mockResolvedValue(undefined),
      getTrackedQueries: jest.fn().mockResolvedValue([]),
    };

    const scraper = {
      scrape: jest.fn().mockRejectedValue(new Error('timeout of 20000ms exceeded')),
    };

    const provider = new QuotesProvider({
      cache: cache as never,
      scraper,
    });

    const result = await provider.getQuotes(QUERY);

    expect(result.data).toEqual(PAYLOAD);
    expect(result.meta).toEqual({
      source: 'cache',
      stale: true,
      staleReason: 'upstream_unavailable',
    });
  });

  it('refreshes all tracked queries and returns counters', async () => {
    const cache = {
      get: jest.fn(),
      getEntry: jest.fn(),
      set: jest.fn().mockResolvedValue(undefined),
      getTrackedQueries: jest.fn().mockResolvedValue([
        QUERY,
        { ...QUERY, city: 'rio-de-janeiro' },
      ]),
    };

    const scraper = {
      scrape: jest
        .fn()
        .mockResolvedValueOnce(PAYLOAD)
        .mockRejectedValueOnce(new Error('upstream failure')),
    };

    const provider = new QuotesProvider({
      cache: cache as never,
      scraper,
    });

    const stats = await provider.refreshTrackedQueries();

    expect(stats).toEqual({ refreshed: 1, failed: 1 });
    expect(scraper.scrape).toHaveBeenCalledTimes(2);
  });
});
