# Documento de Análise — Prato Cheio

*Trabalho 1 · máximo 4 páginas · entrega na Aula 5*

---

## Problema central

Alimentos excedentes (de restaurantes, feiras, mercados) são descartados todos os dias enquanto ONGs que atendem pessoas em situação de vulnerabilidade alimentar não têm acesso a esses recursos. O problema não é falta de comida — é falta de conexão entre quem tem excedente e quem precisa.

---

## Incertezas

- ONGs têm rotina de consulta ativa a sistemas digitais?
- Doadores vão manter o cadastro de doações atualizado sem incentivo externo?
- O prazo entre publicação e retirada é suficiente para alimentos perecíveis?

---

## Stakeholders

| Stakeholder | Interesse | Influência | O que espera |
|---|---|---|---|
| Doador (restaurante, feira, mercado) | Evitar desperdício, ganhar visibilidade social | Alta — sem doadores o sistema não tem valor | Processo simples, rápido, sem burocracia |
| ONG / receptor | Acessar alimentos antes que estraguem | Alta — sem ONGs ninguém retira | Lista atualizada, informação clara sobre tipo e prazo |
| Beneficiários finais | Receber alimentação adequada | Baixa (usuários indiretos) | Qualidade e regularidade das doações |
| Equipe de desenvolvimento | Entregar produto funcional e evolutível | Média | Requisitos claros, feedback rápido |

---

## Objetivos de impacto

1. Reduzir o volume de alimentos descartados por doadores cadastrados.
2. Aumentar a frequência com que ONGs recebem doações antes do vencimento.
3. Tornar o processo de doação simples o suficiente para ser mantido sem suporte.

---

## Regras de negócio

- Uma doação precisa informar: tipo de alimento, quantidade e validade.
- Uma doação recém-criada entra com status `disponivel`.
- Somente doações com status `disponivel` aparecem na lista para ONGs.
- Uma doação pode ser aceita por **uma única ONG**: a primeira que confirmar o aceite vence; tentativas subsequentes são recusadas.
- O aceite é implementado como atualização condicional no banco (`UPDATE ... WHERE status = 'disponivel'`), evitando condição de corrida.

---

## Histórias de usuário

| # | História (Como… quero… para…) | Observação INVEST |
|---|---|---|
| H1 | Como **doador**, quero publicar uma doação informando tipo, quantidade e validade, para que ONGs possam retirá-la antes que estrague. | Pequena, testável, independente das demais |
| H2 | Como **ONG**, quero ver a lista de doações disponíveis com tipo, quantidade e doador, para escolher quais retirar. | Depende de H1 existir no banco — sequenciar no sprint |
| H3 | Como **ONG**, quero aceitar uma doação disponível, para garantir que irei retirá-la. | Depende de H1 e H2; critério de corrida é a regra mais crítica |

---

## Critérios de aceite

### História 1 — Doador publica uma doação

**Publicação com sucesso**
- Dado que o doador preencheu tipo, quantidade e validade
- Quando ele confirma a publicação
- Então a doação deve aparecer na lista com status `disponivel`

**Campo obrigatório ausente**
- Dado que falta um campo obrigatório (tipo, quantidade ou validade)
- Quando o doador tenta publicar
- Então o sistema deve impedir e indicar quais campos estão faltando

**Quantidade inválida**
- Dado que a quantidade informada é vazia ou só espaços
- Quando o doador tenta publicar
- Então o sistema deve rejeitar com mensagem de erro

---

### História 2 — ONG visualiza doações disponíveis

**Lista com doações**
- Dado que existem doações com status `disponivel`
- Quando a ONG acessa a lista
- Então o sistema exibe todas elas com tipo, quantidade e doador

**Lista vazia**
- Dado que não há doações disponíveis
- Quando a ONG acessa a lista
- Então o sistema retorna lista vazia (array `[]`)

**Doação já aceita some da lista**
- Dado que uma doação foi aceita por uma ONG
- Quando qualquer ONG acessa a lista
- Então essa doação não aparece mais

---

### História 3 — ONG aceita uma doação

**Aceite com sucesso**
- Dado que a doação está com status `disponivel`
- Quando a ONG confirma o aceite
- Então o status muda para `aceita` e o campo `ong` registra quem aceitou

**Doação já aceita por outra ONG**
- Dado que outra ONG já aceitou a doação
- Quando uma segunda ONG tenta aceitá-la
- Então o sistema retorna erro 400 informando que a doação não está mais disponível

---

## Riscos e mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| **Baixa adesão de doadores** — poucas doações publicadas, sistema fica vazio e não gera valor para ONGs | Alta (projeto novo, sem base de usuários) | Alto | Iniciar com piloto fechado com doadores já engajados (ex.: restaurantes parceiros). Manter formulário com mínimo de campos obrigatórios para reduzir fricção. |
| **Condição de corrida no aceite** — duas ONGs tentam aceitar a mesma doação simultaneamente, gerando duplicidade | Média (mais provável com crescimento do sistema) | Alto | Aceite implementado como `UPDATE ... WHERE status = 'disponivel'`: apenas a primeira transação altera a linha; a segunda encontra zero linhas alteradas e recebe erro. |

---

## Hipótese e experimento

**Suposição identificada:** ONGs vão consultar a lista de doações com frequência suficiente para retirar alimentos perecíveis antes que estraguem, sem necessidade de notificação ativa.

**Hipótese testável:**
> Se ONGs cadastradas tiverem acesso a uma lista simples de doações disponíveis, elas vão consultá-la ao menos uma vez por dia. Confirmaremos isso se, num piloto de 2 semanas, ≥ 70% das doações publicadas forem aceitas antes do prazo de validade informado.

**Experimento:**
- **Participantes:** 2–3 ONGs parceiras + 3–5 doadores recorrentes.
- **Duração:** 2 semanas.
- **Protocolo:** publicar doações com prazos curtos e realistas, sem nenhuma notificação push. ONGs acessam por conta própria.
- **Métricas coletadas:**
  - % de doações aceitas antes de vencer
  - Tempo médio entre publicação e aceite
- **Critério de falsificação:** se menos de 70% das doações forem aceitas no prazo, a suposição cai e o time precisa de mecanismo de notificação ativa (ex.: WhatsApp) antes de investir em mais funcionalidades.

---

## Decisão de análise

- **Problema:** conectar doadores de alimentos excedentes a ONGs antes do vencimento.
- **Alternativas consideradas:**
  - App mobile com geolocalização (descartado: complexidade e custo iniciais muito altos para validar a hipótese central)
  - Integração com WhatsApp Business API (descartado para V1: dependência externa, custo, tempo de aprovação)
  - Lista web simples com SQLite (escolhido: custo zero de infraestrutura, fácil de colocar em piloto em dias)
- **Decisão e justificativa:** walkskeleton como lista web com SQLite embutido. Permite validar a hipótese central (ONGs consultam sem notificação?) com o menor investimento possível. A arquitetura de `db.js` já prevê troca por PostgreSQL sem espalhar mudança.
- **Riscos e limitações:** não escala para produção com múltiplos usuários simultâneos (SQLite tem limitações de concorrência); isso é intencional para Unidade 1 — a refatoração para PostgreSQL está planejada para Unidade 3.

---

## Walking Skeleton — implementação

### Arquitetura em camadas

```
HTTP (app.js)  →  Regras de negócio (doacoes.js)  →  Repositório (repositorio.js)  →  Banco (db.js / SQLite)
```

### Arquivos modificados

| Arquivo | O que faz |
|---|---|
| `src/repositorio.js` | Acesso ao banco: `inserir`, `listarDisponiveis`, `buscarPorId`, `aceitar` (UPDATE condicional) |
| `src/doacoes.js` | Regras de negócio: validação de campos obrigatórios, orquestração do aceite com checagem de status |
| `tests/doacoes.test.js` | 7 testes cobrindo as 3 histórias — todos os `it.todo` substituídos por testes reais |

### Resultado dos testes

```
Test Files  1 passed (1)
     Tests  7 passed (7)
  Duration  ~5s
```

Testes executados com banco SQLite em memória (`DATABASE_FILE=:memory:` via `vitest.config.js`) — nada a instalar, nada a subir.

### Como rodar localmente

```bash
npm install
npm test
```

---

## Uso de IA

- Estrutura inicial das histórias e critérios de aceite foi gerada com apoio de IA e revisada pelo grupo para aderência ao caso real.
- Implementação de `repositorio.js` e `doacoes.js` gerada por IA; lógica do UPDATE condicional revisada e validada manualmente como solução correta para o risco de condição de corrida.
- Testes escritos por IA seguindo os critérios de aceite definidos pelo grupo; todos executados e verificados passando.
- Hipótese e experimento elaborados pelo grupo com IA como ferramenta de estruturação.
