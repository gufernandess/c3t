import type Redis from 'ioredis';
import type { ExchangeScrapeResult, ProductType } from '../scraper/types.js';

export interface QuoteQuery {
  currency: string;
  city: string;
  operation: 'compra' | 'venda';
  productType: ProductType;
}

export interface CachedQuoteEntry {
  payload: ExchangeScrapeResult;
  cachedAt: string;
}

function buildCacheKey(query: QuoteQuery): string {
  return `quotes:${query.operation}:${query.currency}:${query.city}:${query.productType}`;
}

function buildTrackedSetKey(): string {
  return 'quotes:tracked-queries';
}

export class QuotesCache {
  constructor(
    private readonly client: Pick<Redis, 'get' | 'set' | 'sadd' | 'smembers'>,
    private readonly ttlSeconds: number,
  ) {}

  async get(query: QuoteQuery): Promise<ExchangeScrapeResult | null> {
    const entry = await this.getEntry(query);
    return entry?.payload ?? null;
  }

  async getEntry(query: QuoteQuery): Promise<CachedQuoteEntry | null> {
    const raw = await this.client.get(buildCacheKey(query));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as ExchangeScrapeResult | CachedQuoteEntry;
    if ('payload' in parsed && 'cachedAt' in parsed) {
      return parsed;
    }

    return {
      payload: parsed,
      cachedAt: new Date().toISOString(),
    };
  }

  async set(query: QuoteQuery, payload: ExchangeScrapeResult): Promise<void> {
    const key = buildCacheKey(query);
    const entry: CachedQuoteEntry = {
      payload,
      cachedAt: new Date().toISOString(),
    };

    await this.client.set(key, JSON.stringify(entry), 'EX', this.ttlSeconds);
    await this.client.sadd(buildTrackedSetKey(), JSON.stringify(query));
  }

  async getTrackedQueries(): Promise<QuoteQuery[]> {
    const entries = await this.client.smembers(buildTrackedSetKey());
    return entries.map((entry) => JSON.parse(entry) as QuoteQuery);
  }
}
