import axios, { type AxiosInstance } from 'axios';
import { env } from '../config/env.js';
import { parseExchangeRatesPage } from './parser.js';
import type { ExchangeScrapeResult, ProductType, ScraperParams } from './types.js';

const BASE_URL = env.MELHOR_CAMBIO_BASE_URL;

function buildPath(params: ScraperParams): string {
  return `/cotacao/${params.operation}/${params.currencySlug}/${params.citySlug}`;
}

export class MelhorCambioScraper {
  private readonly httpClient: AxiosInstance;

  constructor(httpClient?: AxiosInstance) {
    this.httpClient =
      httpClient ??
      axios.create({
        baseURL: BASE_URL,
        timeout: 20000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml',
        },
      });
  }

  async scrape(params: ScraperParams, productType: ProductType = 'papel-moeda'): Promise<ExchangeScrapeResult> {
    const path = buildPath(params);
    const response = await this.httpClient.get<string>(path, {
      responseType: 'text',
    });

    const sourceUrl = `${BASE_URL}${path}`;
    return parseExchangeRatesPage(response.data, sourceUrl, new Date(), productType);
  }
}
