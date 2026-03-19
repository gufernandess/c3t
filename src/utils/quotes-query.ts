import type { ExchangeHouseQuote } from '../scraper/types.js';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

export type SortBy = 'quoteValue' | 'rating';
export type SortOrder = 'asc' | 'desc';

export function normalizePage(input: number | undefined): number {
  if (!input || input < 1) {
    return DEFAULT_PAGE;
  }

  return Math.floor(input);
}

export function normalizeLimit(input: number | undefined): number {
  if (!input || input < 1) {
    return DEFAULT_LIMIT;
  }

  return Math.min(Math.floor(input), MAX_LIMIT);
}

export function normalizeSortBy(input: string | undefined): SortBy {
  if (input === 'rating') {
    return 'rating';
  }

  return 'quoteValue';
}

export function normalizeSortOrder(input: string | undefined): SortOrder {
  if (input === 'desc') {
    return 'desc';
  }

  return 'asc';
}

export function sortQuotes(quotes: ExchangeHouseQuote[], sortBy: SortBy, sortOrder: SortOrder): ExchangeHouseQuote[] {
  const direction = sortOrder === 'asc' ? 1 : -1;

  return [...quotes].sort((a, b) => {
    if (sortBy === 'rating') {
      const aValue = a.rating ?? -1;
      const bValue = b.rating ?? -1;
      return (aValue - bValue) * direction;
    }

    return (a.quoteValue - b.quoteValue) * direction;
  });
}

export function paginateQuotes(quotes: ExchangeHouseQuote[], page: number, limit: number): {
  items: ExchangeHouseQuote[];
  total: number;
  totalPages: number;
} {
  const total = quotes.length;
  const totalPages = total === 0 ? 1 : Math.ceil(total / limit);
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * limit;
  const end = start + limit;

  return {
    items: quotes.slice(start, end),
    total,
    totalPages,
  };
}
