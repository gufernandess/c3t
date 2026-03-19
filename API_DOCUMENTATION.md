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
Endpoint de consulta de cotações com estratégia cache-first:
- tenta retornar do Redis primeiro;
- se não houver cache, faz scraping em tempo real, salva no Redis e retorna.
- se a fonte externa falhar, tenta retornar o último cache válido com aviso de dados potencialmente desatualizados.

#### Query Params
- `currency` (string, obrigatório): slug da moeda em minúsculo, sem acento e com hífen quando necessário. Ex.: `dolar-turismo`
- `city` (string, obrigatório): slug da cidade em minúsculo, sem acento e com hífen. Ex.: `sao-paulo`
- `operation` (enum, obrigatório): `compra` ou `venda`
- `productType` (enum, opcional): `papel-moeda` ou `cartao-prepago` (default `papel-moeda`)
- `page` (integer, opcional): página atual (default `1`)
- `limit` (integer, opcional): itens por página (default `10`, max `100`)
- `sortBy` (enum, opcional): `quoteValue` ou `rating` (default `quoteValue`)
- `sortOrder` (enum, opcional): `asc` ou `desc` (default `asc`)

Formato esperado para `currency` e `city`:
`^[a-z0-9]+(?:-[a-z0-9]+)*$`

#### Exemplo de chamada
```bash
curl "http://localhost:3000/quotes?currency=dolar-turismo&city=sao-paulo&operation=compra&productType=papel-moeda"
```

Exemplo com paginação e ordenação por rating:
```bash
curl "http://localhost:3000/quotes?currency=dolar-turismo&city=sao-paulo&operation=compra&page=1&limit=5&sortBy=rating&sortOrder=desc"
```

#### Resposta
```json
{
  "data": {
    "fetchedAt": "2026-03-19T01:00:00.000Z",
    "currencyName": "Dólar",
    "cityName": "São Paulo",
    "operation": "compra",
    "productType": "papel-moeda",
    "quotes": [
      {
        "name": "Casa Exemplo",
        "quoteValue": 5.59,
        "partnerRecommended": true,
        "rating": 4.5,
        "operationsLast60Days": 120,
        "companyType": "Corretora de Câmbio",
        "legalName": "CASA EXEMPLO LTDA.",
        "bacenCode": "12345",
        "address": "Av. Paulista, 1000",
        "businessHours": "Seg/Sex - 9h às 18h",
        "notes": "Delivery sob consulta"
      }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalItems": 19,
    "totalPages": 2,
    "hasNextPage": true,
    "hasPreviousPage": false
  },
  "warnings": []
}
```

Quando houver fallback para cache antigo por falha no provedor externo, a resposta `200` inclui:
```json
{
  "warnings": [
    {
      "code": "STALE_DATA",
      "message": "Os dados exibidos podem estar desatualizados devido à indisponibilidade temporária da fonte externa."
    }
  ]
}
```

#### Respostas de erro

`400 VALIDATION_ERROR` - parâmetros inválidos
```json
{
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "error": "Request Error",
  "message": "Parâmetros inválidos. Revise os dados enviados e tente novamente."
}
```

`502 UPSTREAM_LAYOUT_CHANGED` - estrutura do site fonte mudou
```json
{
  "statusCode": 502,
  "code": "UPSTREAM_LAYOUT_CHANGED",
  "error": "Request Error",
  "message": "Não foi possível processar os dados da fonte externa neste momento. Tente novamente em alguns minutos."
}
```

`502 UPSTREAM_REQUEST_FAILED` - falha genérica na consulta externa
```json
{
  "statusCode": 502,
  "code": "UPSTREAM_REQUEST_FAILED",
  "error": "Request Error",
  "message": "Não foi possível obter as cotações no momento. Tente novamente mais tarde."
}
```

`503 UPSTREAM_TIMEOUT` - timeout na consulta externa
```json
{
  "statusCode": 503,
  "code": "UPSTREAM_TIMEOUT",
  "error": "Request Error",
  "message": "A consulta ao provedor externo excedeu o tempo limite. Tente novamente em alguns instantes."
}
```

`500 INTERNAL_SERVER_ERROR` - erro interno inesperado
```json
{
  "statusCode": 500,
  "code": "INTERNAL_SERVER_ERROR",
  "error": "Internal Server Error",
  "message": "Ocorreu um erro interno ao processar a requisição."
}
```

## Atualizacao automatica
- O worker executa a cada 30 minutos (configurado por `QUOTE_REFRESH_CRON`).
- O worker atualiza no Redis as consultas já registradas no histórico de uso.
- TTL do cache configurável por `CACHE_TTL_SECONDS`.
