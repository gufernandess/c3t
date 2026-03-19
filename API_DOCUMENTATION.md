# API Documentation

## Swagger / OpenAPI
- UI interativa: `GET /docs`
- Spec OpenAPI (json): `GET /docs/json`

## Rotas atuais

### `GET /`
Healthcheck simples da API.

Resposta:
```json
{
  "status": "ok",
  "service": "tourism-exchange-api"
}
```

### `GET /quotes`
Endpoint de consulta de cotacoes (neste momento, estruturado e documentado para integracao com cache/scraper).

#### Query Params
- `currency` (string, obrigatorio): slug da moeda em minusculo, sem acento e com hifen quando necessario. Ex.: `dolar-turismo`
- `city` (string, obrigatorio): slug da cidade em minusculo, sem acento e com hifen. Ex.: `sao-paulo`
- `operation` (enum, obrigatorio): `compra` ou `venda`
- `productType` (enum, opcional): `papel-moeda` ou `cartao-prepago` (default `papel-moeda`)

Formato esperado para `currency` e `city`:
`^[a-z0-9]+(?:-[a-z0-9]+)*$`

#### Exemplo de chamada
```bash
curl "http://localhost:3000/quotes?currency=dolar-turismo&city=sao-paulo&operation=compra&productType=papel-moeda"
```

#### Resposta atual (mock estruturado)
```json
{
  "message": "Endpoint documentado e pronto para integrar com cache/scraper.",
  "query": {
    "currency": "dolar-turismo",
    "city": "sao-paulo",
    "operation": "compra",
    "productType": "papel-moeda"
  }
}
```

## Proximo passo
Integrar `GET /quotes` ao Redis e ao scraper para retorno real das cotações.
