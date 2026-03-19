# Relatorio de Testes

## Objetivo
Validar a base do scraper do Melhor Cambio com testes unitarios no Jest.

## Escopo validado
- Parser HTML (`parseExchangeRatesPage`) com extracao de metadados e cards.
- Ordenacao de cotacoes por menor valor.
- Tratamento de erro quando a estrutura principal da pagina nao existe.
- Cliente HTTP (`MelhorCambioScraper`) com formacao de rota e integracao fetch + parse.

## Comando executado
```bash
npm test
```

## Resultado
- Test Suites: 3 passed, 3 total
- Tests: 5 passed, 5 total

## Observacoes
- O modulo de scraper esta validado em nivel unitario.
- Proxima etapa recomendada: adicionar testes de integracao com Redis (cache) e worker agendado.
