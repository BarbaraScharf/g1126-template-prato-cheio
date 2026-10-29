# Prato Cheio

Projeto da disciplina **Análise, Projeto e Desenvolvimento Ágil**.
Conecta doadores de alimentos excedentes a ONGs, antes que a comida se perca.

## Integrantes
- Ana Beatriz Pedrozo — @AyuraZ
- Bárbara Scharf de Almeida — @BarbaraScharf
- Leonardo André Ferreira — @LeonardoAFer
- Marcelo Gustavo Eger — @MarceloGE
- Willian Squena — @willzera13

---

## Como rodar

**Requisitos:** Node.js 22.13 ou superior.

```bash
npm install           # instala as dependências
npm test              # roda os 20 testes (usa SQLite em memória, sem Docker)
npm start             # sobe em http://localhost:3000
```

> Para rodar com PostgreSQL (produção), suba o Docker primeiro:
> ```bash
> docker compose up -d
> npm start
> ```
> A conexão usa `DATABASE_URL` (padrão: `postgres://pratocheio:pratocheio@localhost:5432/pratocheio`).

---

## Funcionalidades implementadas

| História | Descrição | Rota |
|---|---|---|
| H1 | Doador publica uma doação | `POST /api/doacoes` |
| H2 | ONG visualiza doações disponíveis | `GET /api/doacoes` |
| H3 | ONG aceita uma doação | `POST /api/doacoes/:id/aceitar` |
| H4 | Doador cancela uma doação disponível | `DELETE /api/doacoes/:id` |
| H5 | ONG filtra doações por tipo | `GET /api/doacoes?tipo=Arroz` |

**Validações:**
- Tipo de alimento não pode conter números
- Validade não pode ser data passada (aceita hoje e futuro)
- Nome da ONG é obrigatório para aceitar
- Doação aceita não pode ser cancelada

---

## Banco de dados

| Ambiente | Banco | Como ativar |
|---|---|---|
| Testes (`npm test`) | SQLite em memória | automático via `vitest.config.js` |
| Desenvolvimento local | SQLite em arquivo | `DATABASE_FILE=dados.sqlite npm start` |
| Produção / CI | PostgreSQL | `docker compose up -d` + `DATABASE_URL` |

O `src/database/db.js` detecta automaticamente qual banco usar:
- se `DATABASE_FILE` está definido → SQLite
- caso contrário → PostgreSQL via `DATABASE_URL`

---

## Estrutura do projeto

```
src/
  server.js                         entrypoint (npm start)
  app.js                            Express + rota de saúde
  controllers/doacoesController.js  rotas HTTP de /api/doacoes
  services/doacoesService.js        regras de negócio e validações
  repositories/doacoesRepository.js acesso ao banco (SQL)
  database/db.js                    conexão — SQLite ou PostgreSQL
public/index.html                   interface web (funciona no celular)
tests/doacoes.test.js               20 testes de integração
docs/
  analise.md                        Trabalho 1 — análise
  projeto.md                        Trabalho 2 — decisões e RNFs
  adr/                              ADRs (decisões arquiteturais)
  retrospectivas/                   retrospectivas de cada iteração
.github/workflows/ci.yml            pipeline de CI
docker-compose.yml                  PostgreSQL para desenvolvimento
```

---

## Testes

```bash
npm test
```

Todos os 20 testes rodam com SQLite em memória — sem Docker, sem configuração extra.

```
Test Files  1 passed (1)
     Tests  20 passed (20)
```

---

## ADRs

As principais decisões arquiteturais estão documentadas em `docs/adr/`:

- **ADR-0001** — Migração de SQLite para PostgreSQL
- **ADR-0002** — SQL puro vs ORM

---

## Uso de IA

A IA (Kiro, Claude e Gemini) foi usada principalmente para pequenas melhorias, ajustes pontuais e aprendizado de código. As decisões de arquitetura e as escolhas entre alternativas foram tomadas pelo grupo. Todo código gerado foi revisado e validado antes de entrar no repositório.
