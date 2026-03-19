# Arquitetura: Tourism Exchange API

## 1. Visão Geral
API para cotações de turismo, realizando web scraping do site melhorcambio.com e servindo dados cacheados via Redis para alta performance.

## 2. Tecnologias
- **Linguagem:** NodeJS + TypeScript
- **Framework API:** Fastify
- **Cache/Storage:** Redis
- **Scraping:** Cheerio + Axios
- **Agendamento:** node-cron
- **Testes:** Jest

## 3. Arquitetura do Sistema
O sistema é um monolito composto por dois processos principais rodando no mesmo contexto (ou containers Docker, se necessário):

### A. Worker (Background)
- Executa a cada 30 minutos via `node-cron`.
- Realiza requisições HTTP (axios) ao site.
- Faz o parsing do HTML (cheerio).
- Persiste os dados no **Redis** com TTL.

### B. API (Fastify)
- Recebe requisições dos clientes.
- Consulta o **Redis** para servir os dados (Cache-Aside Pattern).
- Retorna JSON estruturado.

## 4. Fluxo de Dados
[Request Usuário] -> [API Fastify] -> [Redis Cache] -> [Response]
(Se Redis vazio, o Worker é disparado ou aguarda-se o próximo ciclo).

## 5. Estrutura de Pastas
/src
  /api        # Rotas e controladores Fastify
  /scraper    # Lógica de extração de dados
  /worker     # Tarefas agendadas
  /services   # Conexão com Redis e lógica de negócio
  /tests      # Testes unitários Jest
