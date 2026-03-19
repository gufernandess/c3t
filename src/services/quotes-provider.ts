import { env } from '../config/env.js';
import { MelhorCambioScraper } from '../scraper/client.js';
import type { ExchangeScrapeResult, ProductType, ScraperParams } from '../scraper/types.js';
import { QuotesCache, type QuoteQuery } from './quotes-cache.js';
import { getRedisClient } from './redis.js';

export interface QuotesProviderDeps {
  cache?: QuotesCache;
  scraper?: Pick<MelhorCambioScraper, 'scrape'>;
}

export class QuotesProvider {
  private readonly cache: QuotesCache;
  private readonly scraper: Pick<MelhorCambioScraper, 'scrape'>;

  constructor(deps?: QuotesProviderDeps) {
    this.cache = deps?.cache ?? new QuotesCache(getRedisClient(), env.CACHE_TTL_SECONDS);
    this.scraper = deps?.scraper ?? new MelhorCambioScraper();
  }

  async getQuotes(query: QuoteQuery): Promise<{ data: ExchangeScrapeResult; source: 'cache' | 'scraper' }> {
    const cached = await this.cache.get(query);
    if (cached) {
      return { data: cached, source: 'cache' };
    }

    const scraperParams: ScraperParams = {
      currencySlug: query.currency,
      citySlug: query.city,
      operation: query.operation,
    };

    const scraped = await this.scraper.scrape(scraperParams, query.productType);
    await this.cache.set(query, scraped);

    return { data: scraped, source: 'scraper' };
  }

  async refreshQuery(query: QuoteQuery): Promise<ExchangeScrapeResult> {
    const scraperParams: ScraperParams = {
      currencySlug: query.currency,
      citySlug: query.city,
      operation: query.operation,
    };

    const scraped = await this.scraper.scrape(scraperParams, query.productType);
    await this.cache.set(query, scraped);
    return scraped;
  }

  async refreshTrackedQueries(): Promise<{ refreshed: number; failed: number }> {
    const tracked = await this.cache.getTrackedQueries();
    let refreshed = 0;
    let failed = 0;

    for (const query of tracked) {
      try {
        await this.refreshQuery(query);
        refreshed += 1;
      } catch {
        failed += 1;
      }
    }

    return { refreshed, failed };
  }
}

export function normalizeProductType(input: string | undefined): ProductType {
  return input === 'cartao-prepago' ? 'cartao-prepago' : 'papel-moeda';
}
