import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';
import type {
  ExchangeHouseQuote,
  ExchangeScrapeResult,
  OperationType,
  ProductType,
} from './types.js';

const CURRENCY_CITY_REGEX = /^Taxas de c[aâ]mbio turismo para\s+(comprar|vender)\s+(.+?)\s+em\s+(.+)$/i;

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function parseBrlNumber(value: string): number | null {
  const match = value.match(/(\d{1,3}(?:\.\d{3})*,\d{2,4})/);
  if (!match) {
    return null;
  }

  const normalized = match[1].replace(/\./g, '').replace(',', '.');
  const parsed = Number.parseFloat(normalized);

  return Number.isNaN(parsed) ? null : parsed;
}

function parseNullableInt(value: string): number | null {
  const match = value.match(/(\d+)/);
  if (!match) {
    return null;
  }

  const parsed = Number.parseInt(match[1], 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseRating(value: string): number | null {
  const normalized = normalizeText(value).replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseLegalNameAndCode(value: string): { legalName: string | null; bacenCode: string | null } {
  const normalized = normalizeText(value);
  const match = normalized.match(/^(.*?)\s*\[(\d+)\]$/);

  if (!match) {
    return {
      legalName: normalized || null,
      bacenCode: null,
    };
  }

  return {
    legalName: normalizeText(match[1]) || null,
    bacenCode: match[2],
  };
}

function extractHeaderInfo($: cheerio.CheerioAPI): {
  operation: OperationType;
  currencyName: string;
  cityName: string;
} {
  const headingText = normalizeText($('div.div-taxas-cambio > h1').first().text());
  const match = headingText.match(CURRENCY_CITY_REGEX);

  if (!match) {
    throw new Error('Nao foi possivel extrair moeda/cidade/campo de operacao do cabecalho da pagina.');
  }

  const [, operationRaw, currencyName, cityName] = match;

  return {
    operation: operationRaw.toLowerCase() === 'vender' ? 'venda' : 'compra',
    currencyName: normalizeText(currencyName),
    cityName: normalizeText(cityName),
  };
}

function extractFieldByIcon(
  $: cheerio.CheerioAPI,
  card: AnyNode,
  iconName: 'icon-1' | 'icon-2' | 'icon-3' | 'icon-4',
): string | null {
  const row = $(card).find(`tr.borda-end-card:has(img[src*="${iconName}"])`).first();
  if (!row.length) {
    return null;
  }

  const spanText = normalizeText(row.find('span').first().text());
  return spanText || null;
}

function extractCompanyInfo(
  $: cheerio.CheerioAPI,
  card: AnyNode,
): { companyType: string | null; legalName: string | null; bacenCode: string | null } {
  const row = $(card).find('tr.borda-end-card:has(img[src*="icon-1"])').first();
  if (!row.length) {
    return {
      companyType: null,
      legalName: null,
      bacenCode: null,
    };
  }

  const spans = row.find('span');
  const companyType = normalizeText($(spans.get(0)).text()) || null;
  const legalRaw = normalizeText($(spans.get(1)).text());
  const { legalName, bacenCode } = parseLegalNameAndCode(legalRaw);

  return {
    companyType,
    legalName,
    bacenCode,
  };
}

function parseCard($: cheerio.CheerioAPI, card: AnyNode): ExchangeHouseQuote | null {
  const nameContainer = $(card).find('tr').first().find('td').first().clone();
  nameContainer.find('img').remove();
  const name = normalizeText(nameContainer.text());

  const quoteBlock = $(card).find('p:has(> span:contains("Valor com IOF")) > span').last();
  const quoteValue = parseBrlNumber(quoteBlock.text());

  if (!name || quoteValue === null) {
    return null;
  }

  const ratingRaw = $(card).find('tr').eq(1).find('td[colspan="2"] > span').first().text();
  const operationsRaw = $(card).find('tr').eq(1).find('td[colspan="2"] > span.tooltip-right').first().text();

  const { companyType, legalName, bacenCode } = extractCompanyInfo($, card);

  return {
    name,
    quoteValue,
    partnerRecommended: $(card).find('img[title="Selo Melhor Câmbio"]').length > 0,
    rating: parseRating(ratingRaw),
    operationsLast60Days: parseNullableInt(operationsRaw),
    companyType,
    legalName,
    bacenCode,
    address: extractFieldByIcon($, card, 'icon-2'),
    businessHours: extractFieldByIcon($, card, 'icon-3'),
    notes: extractFieldByIcon($, card, 'icon-4'),
  };
}

export function parseExchangeRatesPage(
  html: string,
  sourceUrl: string,
  fetchedAt: Date,
  productType: ProductType = 'papel-moeda',
): ExchangeScrapeResult {
  const $ = cheerio.load(html);

  const headerInfo = extractHeaderInfo($);
  const listSelector = productType === 'papel-moeda' ? '#div-especie ul.resultados-especie' : '#div-vtm ul.resultados-cartao';

  const cards = $(`${listSelector} > li.lista_corretoras`).toArray();
  const quotes = cards
    .map((card) => parseCard($, card))
    .filter((card): card is ExchangeHouseQuote => card !== null)
    .sort((a, b) => a.quoteValue - b.quoteValue);

  return {
    sourceUrl,
    fetchedAt: fetchedAt.toISOString(),
    currencyName: headerInfo.currencyName,
    cityName: headerInfo.cityName,
    productType,
    operation: headerInfo.operation,
    quotes,
  };
}
