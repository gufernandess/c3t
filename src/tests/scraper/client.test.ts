import { MelhorCambioScraper } from '../../scraper/client.js';
import { env } from '../../config/env.js';

const SAMPLE_HTML = `
<html>
  <body>
    <div class="div-taxas-cambio">
      <h1>Taxas de c\u00e2mbio turismo para comprar D\u00f3lar em S\u00e3o Paulo</h1>
    </div>
    <div id="div-especie">
      <ul class="resultados-especie">
        <li class="lista_corretoras">
          <table>
            <tr><td>Casa Teste</td></tr>
            <tr>
              <td>
                <p>
                  <span>Valor com IOF</span>
                  <span>R$ 5,7000</span>
                </p>
              </td>
            </tr>
          </table>
        </li>
      </ul>
    </div>
  </body>
</html>
`;

describe('MelhorCambioScraper', () => {
  it('fetches quote page and returns parsed payload', async () => {
    const get = jest.fn().mockResolvedValue({ data: SAMPLE_HTML });
    const fakeAxios = { get };

    const scraper = new MelhorCambioScraper(fakeAxios as never);
    const result = await scraper.scrape({
      operation: 'compra',
      currencySlug: 'dolar-turismo',
      citySlug: 'sao-paulo',
    });

    expect(get).toHaveBeenCalledWith('/cotacao/compra/dolar-turismo/sao-paulo', { responseType: 'text' });

    expect(result.sourceUrl).toBe(`${env.MELHOR_CAMBIO_BASE_URL}/cotacao/compra/dolar-turismo/sao-paulo`);
    expect(result.currencyName).toBe('Dólar');
    expect(result.cityName).toBe('São Paulo');
    expect(result.quotes).toHaveLength(1);
    expect(result.quotes[0].name).toBe('Casa Teste');
    expect(result.quotes[0].quoteValue).toBe(5.7);
  });
});
