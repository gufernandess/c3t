import { env } from '../config/env.js';
import { AppError } from '../errors/app-error.js';
import { MelhorCambioScraper } from '../scraper/client.js';
import type { ExchangeScrapeResult, ProductType, ScraperParams } from '../scraper/types.js';
import { QuotesCache, type QuoteQuery } from './quotes-cache.js';
import { getRedisClient } from './redis.js';

export interface QuotesProviderDeps {
  cache?: QuotesCache;
  scraper?: Pick<MelhorCambioScraper, 'scrape'>;
}

interface QuotesResultMeta {
  source: 'cache' | 'scraper';
  stale: boolean;
  staleReason?: string;
}

export class QuotesProvider {
  private readonly cache: QuotesCache;
  private readonly scraper: Pick<MelhorCambioScraper, 'scrape'>;

  constructor(deps?: QuotesProviderDeps) {
    this.cache = deps?.cache ?? new QuotesCache(getRedisClient(), env.CACHE_TTL_SECONDS);
    this.scraper = deps?.scraper ?? new MelhorCambioScraper();
  }

  async getQuotes(query: QuoteQuery): Promise<{ data: ExchangeScrapeResult; meta: QuotesResultMeta }> {
    const cached = await this.cache.get(query);
    if (cached) {
      return {
        data: cached,
        meta: {
          source: 'cache',
          stale: false,
        },
      };
    }

    const scraperParams: ScraperParams = {
      currencySlug: query.currency,
      citySlug: query.city,
      operation: query.operation,
    };

    try {
      const scraped = await this.scraper.scrape(scraperParams, query.productType);
      await this.cache.set(query, scraped);

      return {
        data: scraped,
        meta: {
          source: 'scraper',
          stale: false,
        },
      };
    } catch (error) {
      const staleEntry = await this.cache.getEntry(query);
      if (staleEntry) {
        return {
          data: staleEntry.payload,
          meta: {
            source: 'cache',
            stale: true,
            staleReason: 'upstream_unavailable',
          },
        };
      }

      throw error;
    }
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

export function mapQuotesProviderError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    if (error.message.includes('Nao foi possivel extrair moeda/cidade/campo de operacao')) {
      return new AppError(
        502,
        'UPSTREAM_LAYOUT_CHANGED',
        'Não foi possível processar os dados da fonte externa neste momento. Tente novamente em alguns minutos.',
      );
    }

    if (error.message.toLowerCase().includes('timeout')) {
      return new AppError(
        503,
        'UPSTREAM_TIMEOUT',
        'A consulta ao provedor externo excedeu o tempo limite. Tente novamente em alguns instantes.',
      );
    }
  }

  return new AppError(
    502,
    'UPSTREAM_REQUEST_FAILED',
    'Não foi possível obter as cotações no momento. Tente novamente mais tarde.',
  );
}
