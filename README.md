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
npm test              # roda os 39 testes (usa SQLite em memória, sem Docker)
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
| H4 | Doador cancela uma doação disponível | `POST /api/doacoes/:id/cancelar` |
| H5 | ONG filtra doações por tipo | `GET /api/doacoes?tipo=Arroz` |
| H6 | ONG conclui a retirada de uma doação aceita | `POST /api/doacoes/:id/concluir` |
| — | ONG libera reserva (devolve doação à lista) | `POST /api/doacoes/:id/liberar` |
| — | Lista doações aceitas e concluídas | `GET /api/doacoes/aceitas` |

**Validações:**
- Tipo de alimento não pode conter números
- Quantidade deve ser numérica (inteiro ou decimal)
- Validade não pode ser data passada (aceita hoje e futuro)
- Validade deve ser uma data de calendário válida (ex: 30/02 é rejeitado)
- Nome da ONG é obrigatório para aceitar
- Doação aceita não pode ser cancelada
- Apenas doações aceitas podem ser concluídas ou ter a reserva liberada

---

## Definição de Pronto

Uma história está **pronta** quando todos os critérios abaixo são atendidos:

- [ ] **Código revisado** — pelo menos um outro integrante da equipe aprovou o PR
- [ ] **Testes de integração** — todos os cenários da história (sucesso e erros esperados) têm testes automatizados cobrindo a rota HTTP, o serviço e o repositório
- [ ] **CI verde** — o pipeline do GitHub Actions passa (build + testes + health check do servidor)
- [ ] **Sem regressões** — todos os testes existentes continuam passando após a mudança
- [ ] **README atualizado** — a tabela de funcionalidades reflete a nova história e rotas
- [ ] **Sem código morto** — funções declaradas no serviço e no controller têm implementação correspondente no repositório
- [ ] **PR descrito** — o PR documenta o que foi feito, o que foi testado e, se IA foi usada, o que foi mantido, o que foi alterado e por quê

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
tests/doacoes.test.js               39 testes de integração
docs/
  analise.md                        Trabalho 1 — análise
  projeto.md                        Trabalho 2 — decisões e RNFs
  adr/                              ADRs (decisões arquiteturais)
  retrospectivas/                   retrospectivas de cada iteração
  diagramas.md                      diagramas UML (Estados e Sequência)
.github/workflows/ci.yml            pipeline de CI
docker-compose.yml                  PostgreSQL para desenvolvimento
```

---

## Testes

```bash
npm test
```

Todos os 39 testes rodam com SQLite em memória — sem Docker, sem configuração extra.

```
Test Files  1 passed (1)
     Tests  39 passed (39)
```

---

## ADRs

As principais decisões arquiteturais estão documentadas em `docs/adr/`:

- **ADR-0001** — Migração de SQLite para PostgreSQL
- **ADR-0002** — SQL puro vs ORM

---

## Uso de IA

A IA (Kiro, Claude e Gemini) foi usada principalmente para pequenas melhorias, ajustes pontuais e aprendizado de código. As decisões de arquitetura e as escolhas entre alternativas foram tomadas pelo grupo. Todo código gerado foi revisado e validado antes de entrar no repositório.
