# Estado atual — Job Application Tracker Demo

Revisão documental local: **13/10/2026**, America/Sao_Paulo. Git inicial limpo em `main`.

## Evidência estática

`package.json` requer Node >=22.12 e declara React/Vite. `server/store.mjs` cria tabelas de vagas/eventos e índices, habilita foreign keys e chama `seedDemoData` quando o banco está vazio. O seed percorre 32 registros, usa organizações inventadas e links `example.com`; tudo foi observado no código, sem executar o gerador.

`server/app.mjs` e `server.mjs` organizam API/entrada; `src/App.jsx` é a interface. Existe `test/server.test.mjs`. O README descreve filtros, drawer, paginação, seleção e responsividade; esses comportamentos de UI não foram validados nesta sessão.

## Operação identificada

Scripts em `package.json`: `pnpm dev`, `pnpm build`, `pnpm start`, `pnpm test` e `pnpm check` (testes mais build). O README orienta preparar pnpm e abrir a porta local 4173. Banco gerado em `.data/`, segundo o README.

Todos os comandos/testes: **não executado nesta tarefa**. Nenhum banco existente foi aberto.

## Retomada

Última etapa comprovada: organização e conferência documental local. Não há resultado de testes novo, execução da API ou validação de tela. O README afirma história Git e fixtures sanitizadas; esta organização não auditou toda a história.

Sugestões, sem fase aprovada presumida:

1. Em tarefa autorizada, rodar a suíte com banco de teste sintético.
2. Conferir no navegador os fluxos mencionados pelo README.
3. Manter dados fictícios em qualquer nova captura/demo.

Consulte [arquitetura](ARQUITETURA.md) e [índice](INDEX.md).
