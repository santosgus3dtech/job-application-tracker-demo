# Arquitetura e regras — Job Application Tracker Demo

Fontes: `README.md`, `package.json`, `server/app.mjs` e `server/store.mjs`.

A UI React/Vite em `src/` consome a API HTTP Node. A camada `server/store.mjs` usa `DatabaseSync` do SQLite embutido, cria tabelas `jobs` e `application_events` e índices para país/status e compatibilidade.

`openDatabase` prepara o diretório do banco, habilita foreign keys e inicializa schema. Um banco vazio recebe `seedDemoData`, com transação explícita e rollback em erro. O seed gera 32 vagas de forma determinística, eventos `demo_seeded` e links de exemplo.

## Regras observadas/documentadas

- Somente banco vazio recebe o seed automaticamente.
- Eventos referenciam vagas com foreign key e exclusão em cascata no schema.
- Dados são fictícios por intenção documentada e estrutura do seed; não importar exportações privadas para esta cópia.
- Metadados de candidaturas/currículos no schema são campos demonstrativos, sem comprovação de dados reais.
- Filtros e atualização de status são descritos no README; a inspeção de arquivos não prova execução da interface.

Não foi identificada decisão histórica nova a registrar. [Estado atual](ESTADO-ATUAL.md) concentra lacunas e sugestões.
