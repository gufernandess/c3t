export type OperationType = 'compra' | 'venda';

export type ProductType = 'papel-moeda' | 'cartao-prepago';

export interface ScraperParams {
  currencySlug: string;
  citySlug: string;
  operation: OperationType;
}

export interface ExchangeHouseQuote {
  name: string;
  quoteValue: number;
  partnerRecommended: boolean;
  rating: number | null;
  operationsLast60Days: number | null;
  companyType: string | null;
  legalName: string | null;
  bacenCode: string | null;
  address: string | null;
  businessHours: string | null;
  notes: string | null;
}

export interface ExchangeScrapeResult {
  sourceUrl: string;
  fetchedAt: string;
  currencyName: string;
  cityName: string;
  productType: ProductType;
  operation: OperationType;
  quotes: ExchangeHouseQuote[];
}
