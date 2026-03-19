import { parseExchangeRatesPage } from '../../scraper/parser.js';

const SAMPLE_HTML = `
<html>
  <body>
    <div class="div-taxas-cambio">
      <h1>Taxas de c\u00e2mbio turismo para comprar D\u00f3lar em S\u00e3o Paulo</h1>
    </div>

    <div id="div-especie">
      <ul class="resultados-especie">
        <li class="lista_corretoras" id="li-1">
          <table>
            <tr>
              <td>
                GetMoney
                <img title="Selo Melhor C\u00e2mbio" src="/img/verified.png" />
              </td>
            </tr>
            <tr>
              <td colspan="2">
                <span>4,5</span>
                <span class="tooltip-right">(116)</span>
              </td>
            </tr>
            <tr class="borda-end-card">
              <td><img src="/img/icon-1.png" /></td>
              <td colspan="4">
                <span>Corretora de C\u00e2mbio</span>
                <span>GET MONEY C.C. S.A. [27143]</span>
              </td>
            </tr>
            <tr class="borda-end-card">
              <td><img src="/img/icon-2.png" /></td>
              <td colspan="2"><span>Shopping Eldorado 2\u00ba Subsolo - Pinheiros</span></td>
            </tr>
            <tr class="borda-end-card">
              <td><img src="/img/icon-3.png" /></td>
              <td colspan="4"><span>Seg/Sex: 10h \u00e0s 21h30</span></td>
            </tr>
            <tr class="borda-end-card">
              <td><img src="/img/icon-4.png" /></td>
              <td colspan="4"><span>Delivery sujeito a taxas</span></td>
            </tr>
            <tr>
              <td>
                <p>
                  <span>Valor com IOF</span>
                  <span><small>R$ </small>5,5902</span>
                </p>
              </td>
            </tr>
          </table>
        </li>

        <li class="lista_corretoras" id="li-2">
          <table>
            <tr><td>Vali C\u00e2mbio</td></tr>
            <tr>
              <td colspan="2">
                <span>4,1</span>
                <span class="tooltip-right">(39)</span>
              </td>
            </tr>
            <tr class="borda-end-card">
              <td><img src="/img/icon-1.png" /></td>
              <td colspan="4">
                <span>Correspondente Cambial</span>
                <span>TROCKA CC LTDA. [41814]</span>
              </td>
            </tr>
            <tr>
              <td>
                <p>
                  <span>Valor com IOF</span>
                  <span><small>R$ </small>5,5903</span>
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

describe('parseExchangeRatesPage', () => {
  it('extracts page metadata and exchange house cards', () => {
    const fetchedAt = new Date('2026-03-19T00:00:00.000Z');

    const result = parseExchangeRatesPage(
      SAMPLE_HTML,
      'https://www.melhorcambio.com/cotacao/compra/dolar-turismo/sao-paulo',
      fetchedAt,
    );

    expect(result.currencyName).toBe('Dólar');
    expect(result.cityName).toBe('São Paulo');
    expect(result.operation).toBe('compra');
    expect(result.productType).toBe('papel-moeda');
    expect(result.fetchedAt).toBe('2026-03-19T00:00:00.000Z');
    expect(result.quotes).toHaveLength(2);

    expect(result.quotes[0]).toMatchObject({
      name: 'GetMoney',
      quoteValue: 5.5902,
      partnerRecommended: true,
      rating: 4.5,
      operationsLast60Days: 116,
      companyType: 'Corretora de Câmbio',
      legalName: 'GET MONEY C.C. S.A.',
      bacenCode: '27143',
      address: 'Shopping Eldorado 2º Subsolo - Pinheiros',
      businessHours: 'Seg/Sex: 10h às 21h30',
      notes: 'Delivery sujeito a taxas',
    });
  });

  it('sorts quotes by smallest quote value first', () => {
    const result = parseExchangeRatesPage(
      SAMPLE_HTML,
      'https://www.melhorcambio.com/cotacao/compra/dolar-turismo/sao-paulo',
      new Date('2026-03-19T00:00:00.000Z'),
    );

    expect(result.quotes.map((quote) => quote.name)).toEqual(['GetMoney', 'Vali Câmbio']);
    expect(result.quotes.map((quote) => quote.quoteValue)).toEqual([5.5902, 5.5903]);
  });

  it('throws when heading with currency and city is missing', () => {
    expect(() => {
      parseExchangeRatesPage('<html><body><h1>Pagina sem estrutura</h1></body></html>', 'https://example.com', new Date());
    }).toThrow('Nao foi possivel extrair moeda/cidade/campo de operacao do cabecalho da pagina.');
  });
});
