# Cotação de Casas de Câmbio para Turismo (C3T)

API em Node.js para consulta de cotações de câmbio turismo no Brasil, com dados obtidos via scraping do site **Melhor Câmbio**.

## Visão geral

- Projeto monolítico com Fastify.
- Busca cotações por moeda, cidade e operação (compra/venda).
- Usa Redis para cache e atualização periódica.
- Possui paginação, ordenação e tratamento padronizado de erros.
- Documentação interativa com Swagger.

## Fonte dos dados

Os dados são resgatados do site **https://www.melhorcambio.com/** por scraping.

## Instância em produção

Há uma instância pública da aplicação no ar:

- API base: `https://c3t.onrender.com`
- Exemplo de rota: `https://c3t.onrender.com/quotes?currency=dolar-turismo&city=sao-paulo&operation=compra`
- Swagger: `https://c3t.onrender.com/docs`

## Tecnologias utilizadas

- Node.js + TypeScript
- Fastify
- Axios + Cheerio (scraping)
- Redis (cache)
- node-cron (atualização a cada 30 minutos)
- Jest (testes)
- Docker + Docker Compose
- Swagger (`@fastify/swagger` e `@fastify/swagger-ui`)

## Principais funcionalidades

- Endpoint `GET /quotes` com filtros por:
  - `currency`
  - `city`
  - `operation`
  - `productType`
- Paginação:
  - `page`
  - `limit`
- Ordenação:
  - `sortBy=quoteValue|rating`
  - `sortOrder=asc|desc`
- Cache-first:
  - tenta Redis primeiro
  - se não houver cache, faz scraping e salva
- Fallback para cache antigo:
  - se a fonte externa falhar, retorna último cache válido com `warnings`.

## Como executar localmente

### Pré-requisitos

- Node.js instalado
- Docker e Docker Compose instalados

### 1) Configurar variáveis de ambiente

Crie um `.env` com base no exemplo:

```bash
cp .env.example .env
```

### 2) Rodar com Node (sem Docker)

```bash
npm install
npm run dev
```

API disponível em: `http://localhost:3000`

### 3) Rodar com Docker (API + Redis + RedisInsight)

```bash
docker compose up --build -d
```

Serviços:

- API: `http://localhost:3000`
- Swagger: `http://localhost:3000/docs`
- RedisInsight: `http://localhost:5540`

Para parar:

```bash
docker compose down
```

## Scripts úteis

- `npm run dev` - desenvolvimento com watch
- `npm test` - executar testes
- `npm run build` - gerar build TypeScript
- `npm start` - executar build em `dist`

## Documentação da API

- Swagger UI: `GET /docs`
- OpenAPI JSON: `GET /docs/json`
- Documento adicional: `API_DOCUMENTATION.md`

## Exemplo de requisição

```bash
curl "http://localhost:3000/quotes?currency=dolar-turismo&city=sao-paulo&operation=compra&page=1&limit=5&sortBy=quoteValue&sortOrder=asc"
```

## Observações

- Os parâmetros `currency` e `city` devem ser enviados em slug: minúsculo, sem acento e com hífen quando necessário.
- Como a fonte é externa, o layout do site pode mudar e exigir ajustes no parser.

## Licença

Este projeto está licenciado sob a licença MIT. Consulte o arquivo `LICENSE` para mais detalhes.

## Contribuição

Contribuições são bem-vindas. Se você quiser contribuir, abra uma issue para discutir a proposta ou envie um pull request com a melhoria.
