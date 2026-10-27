# Documento de Projeto — Prato Cheio

*Trabalho 2 · máximo 4 páginas (fora diagramas) · entrega na Aula 10*

## Decisões de projeto
| # | Decisão | Alternativas | Requisito/risco da Análise que a motiva |
|---|---|---|---|

## Tabela de trade-offs (uma decisão em detalhe)
| Critério | Alternativa A | Alternativa B |
|---|---|---|

## Diagramas
(contexto + dados ou componentes — em `docs/` ou como imagem)

## ADRs
Ver `docs/adr/`.

## Requisitos não-funcionais
| Requisito | Como afeta o design |
|---|---|

## Requisitos Não Funcionais (RNFs) e Impactos no Projeto

### 1. RNF01 — Portabilidade e Manutenibilidade da Camada de Persistência (Isolamento de Banco de Dados)
* **Descrição:** O sistema deve desacoplar a tecnologia de banco de dados das regras de negócio, permitindo evoluir do SQLite (`node:sqlite`) para o PostgreSQL sem alterar a lógica de domínio ou os contratos da API.
* **Impacto nas decisões de projeto:** 
  * Centralização do acesso ao banco em `src/db.js` expondo uma interface padronizada (`query(sql, valores)` que devolve `{ rows, alteradas }`, `migrar()` e `encerrar()`), mantendo a futura troca para PostgreSQL contida apenas nesse módulo.
  * Adoção do padrão *Repository* em `src/repositorio.js`, isolando todas as instruções SQL e mantendo as regras de negócio (`src/doacoes.js`) e as rotas (`src/app.js`) independentes do SGBD utilizado.
  * Uso de variáveis de ambiente (`DATABASE_FILE` e `DATABASE_URL`) para alternar entre o banco local, o banco em memória dos testes (`:memory:`) e o banco de produção.

### 2. RNF02 — Confiabilidade, Concorrência e Segurança de Dados
* **Descrição:** O sistema deve garantir a integridade do estado das doações mesmo diante de acessos simultâneos (impedindo que duas ONGs aceitem a mesma doação ao mesmo tempo) e proteger o banco contra injeção de SQL (*SQL Injection*) e dados inválidos.
* **Impacto nas decisões de projeto:**
  * **Controle de concorrência atômico:** Em `src/repositorio.js`, a função `aceitar(id, ong)` utiliza atualização condicional (`UPDATE doacoes SET status = 'aceita', ong = ? WHERE id = ? AND status = 'disponivel'`) verificando o número de linhas afetadas (`alteradas === 0`), impedindo condições de corrida (*race conditions*). Além disso, a necessidade de suportar escrita concorrente sem bloqueio de arquivo (*file locking*) fundamentou o ADR de migração do SQLite para o PostgreSQL.
  * **Prevenção contra SQL Injection:** Todas as consultas em `src/repositorio.js` utilizam *parameterized queries* (`?` passados por array de valores para `db.prepare(sql)` em `src/db.js`).
  * **Validação de entrada:** As funções em `src/doacoes.js` validam e higienizam (`trim()`) os campos obrigatórios (`tipo`, `quantidade`, `validade`, `ong`) antes de acionar o banco, retornando status HTTP `400` em `src/app.js` quando há erros.

### 3. RNF03 — Testabilidade e Verificabilidade Automatizada (CI)
* **Descrição:** O sistema deve permitir a execução rápida e isolada de testes de integração a cada alteração de código, sem afetar o banco de dados de desenvolvimento e validando a aplicação via Integração Contínua (CI).
* **Impacto nas decisões de projeto:**
  * **Separação entre App e Servidor HTTP:** `src/app.js` exporta `criarApp()` sem abrir porta de rede, enquanto `src/server.js` faz o `listen()`. Isso permite que o `supertest` e o `vitest` testem as rotas HTTP diretamente em memória.
  * **Isolamento de ambiente de teste:** Configuração do `vitest.config.js` com `env: { DATABASE_FILE: ':memory:' }` e uso da função `limparBanco()` em `src/db.js` antes de cada teste.
  * **Verificação de saúde para CI:** Implementação da rota `GET /api/saude` em `src/app.js` retornando `{ ok: true }` para validação no pipeline do GitHub Actions.
  
## Critérios de validação do projeto

## Uso de IA
