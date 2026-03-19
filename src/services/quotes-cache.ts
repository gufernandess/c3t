import type Redis from 'ioredis';
import type { ExchangeScrapeResult, ProductType } from '../scraper/types.js';

export interface QuoteQuery {
  currency: string;
  city: string;
  operation: 'compra' | 'venda';
  productType: ProductType;
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
    const raw = await this.client.get(buildCacheKey(query));
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as ExchangeScrapeResult;
  }

  async set(query: QuoteQuery, payload: ExchangeScrapeResult): Promise<void> {
    const key = buildCacheKey(query);
    await this.client.set(key, JSON.stringify(payload), 'EX', this.ttlSeconds);
    await this.client.sadd(buildTrackedSetKey(), JSON.stringify(query));
  }

  async getTrackedQueries(): Promise<QuoteQuery[]> {
    const entries = await this.client.smembers(buildTrackedSetKey());
    return entries.map((entry) => JSON.parse(entry) as QuoteQuery);
  }
}
