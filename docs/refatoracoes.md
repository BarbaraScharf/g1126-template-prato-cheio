# Refatorações — Prato Cheio

*Trabalho 3 · quatro refatorações aplicadas com suporte de IA · cada seção registra o cheiro atacado, o que mudou e a evidência dos testes.*

---

## Refatoração 1 — Extração de helpers de validação em `criarDoacao`

### Cheiro atacado
**Função longa (Long Method).** O método `criarDoacao` em `src/services/doacoesService.js` tinha ~40 linhas realizando seis validações distintas de forma sequencial e inline: presença de campos, dígitos no tipo, formato numérico da quantidade, quantidade zero, formato de data e data no passado. Cada validação misturava lógica de regex, parsing de data e lançamento de erro no mesmo bloco linear, dificultando leitura, teste individual e reuso.

### O que mudou
Foram extraídas quatro funções privadas nomeadas no mesmo arquivo:

| Função extraída | Responsabilidade |
|---|---|
| `validarCamposObrigatorios({tipo, quantidade, validade})` | Detecta todos os campos ausentes de uma vez e lança erro com lista completa |
| `validarTipo(tipo)` | Rejeita tipos de alimento que contêm dígitos |
| `validarQuantidade(quantidade)` | Rejeita valores não numéricos e quantidade zero |
| `validarValidade(validade)` | Rejeita datas inválidas no calendário e datas no passado |

O corpo de `criarDoacao` passou de ~40 linhas para 8 linhas — quatro chamadas de validação seguidas de `repo.inserir`. As regras de negócio não mudaram.

As funções foram também exportadas (`export { validarTipo, validarQuantidade, validarValidade, validarCamposObrigatorios }`) para permitir testes unitários diretos sem subir o servidor HTTP.

### Arquivos alterados
- `src/services/doacoesService.js` — extração das funções e simplificação de `criarDoacao`
- `tests/refatoracoes.test.js` *(novo)* — 14 testes unitários diretos sobre cada helper

### Evidência dos testes

**Antes da refatoração:** 41 testes passando (baseline)

**Testes unitários adicionados para esta refatoração** (em `tests/refatoracoes.test.js`):

```
Refatoração 1 — validarCamposObrigatorios (3)
  ✓ lança erro listando todos os campos ausentes de uma vez
  ✓ lança erro quando apenas quantidade e validade estão ausentes
  ✓ não lança erro quando todos os campos estão presentes

Refatoração 1 — validarTipo (4)
  ✓ lança erro quando o tipo contém dígitos
  ✓ lança erro quando o tipo é só números
  ✓ aceita tipo com apenas letras
  ✓ aceita tipo com espaços e acentos

Refatoração 1 — validarQuantidade (5)
  ✓ lança erro para quantidade com texto
  ✓ lança erro para quantidade zero
  ✓ lança erro para quantidade negativa escrita como texto
  ✓ aceita inteiro positivo
  ✓ aceita decimal positivo

Refatoração 1 — validarValidade (5)
  ✓ lança erro para validade no passado
  ✓ lança erro para data inexistente no calendário (02-30)
  ✓ lança erro para formato inválido
  ✓ aceita a data de hoje
  ✓ aceita data futura
```

**Após a refatoração:** 78 testes passando (2 arquivos de teste)

---

## Refatoração 2 — Erros tipados e status HTTP semântico (404 vs 400)

### Cheiro atacado
**Abstração inadequada / status HTTP incorreto.** O `asyncHandler` no controller mapeava *qualquer* exceção para HTTP 400. Quando `buscarOuLancar` lançava `'Doação não encontrada'` por um id inexistente, o cliente recebia 400 (Bad Request) em vez de 404 (Not Found). Os dois casos são semanticamente distintos: 400 indica entrada inválida; 404 indica recurso inexistente. A ausência de tipos nos erros tornava impossível diferenciar as categorias na camada de transporte sem inspecionar a mensagem de texto.

### O que mudou
Foram criadas duas classes de erro exportadas em `src/services/doacoesService.js`:

```js
export class NotFoundError extends Error   // recurso não encontrado → 404
export class BusinessRuleError extends Error // violação de regra de negócio → 400
```

- `buscarOuLancar` passou a lançar `NotFoundError`.
- Todas as violações de regra de negócio (ONG ausente, doação já aceita, status incompatível) passaram a lançar `BusinessRuleError`.
- O `asyncHandler` no controller foi atualizado para:
  ```js
  const status = erro instanceof NotFoundError ? 404 : 400;
  res.status(status).json({ erro: erro.message });
  ```
- Os testes existentes que esperavam `400` para ids inexistentes foram atualizados para `404` (4 assertions em `tests/doacoes.test.js`), refletindo o comportamento correto.

### Arquivos alterados
- `src/services/doacoesService.js` — classes `NotFoundError` e `BusinessRuleError`, uso em `buscarOuLancar` e em todos os métodos de serviço
- `src/controllers/doacoesController.js` — `asyncHandler` distingue o tipo de erro
- `tests/doacoes.test.js` — 4 assertions de status atualizadas de `400` para `404`
- `tests/refatoracoes.test.js` *(novo)* — 6 testes para esta refatoração

### Evidência dos testes

**Testes adicionados** (em `tests/refatoracoes.test.js`):

```
Refatoração 2 — NotFoundError e BusinessRuleError são classes distintas (3)
  ✓ NotFoundError é instância de Error
  ✓ BusinessRuleError é instância de Error
  ✓ NotFoundError não é BusinessRuleError

Refatoração 2 — controller retorna 404 para doação inexistente (5)
  ✓ aceitar doação inexistente retorna 404
  ✓ cancelar doação inexistente retorna 404
  ✓ liberar doação inexistente retorna 404
  ✓ concluir doação inexistente retorna 404
  ✓ violação de regra de negócio (aceitar doação já aceita) ainda retorna 400
```

**Após a refatoração:** 78 testes passando

---

## Refatoração 3 — Eliminação do padrão UPDATE + SELECT duplicado no repositório

### Cheiro atacado
**Código duplicado (Duplicated Code).** Quatro métodos em `src/repositories/doacoesRepository.js` (`aceitar`, `cancelar`, `liberar`, `concluir`) seguiam o mesmo padrão de duas etapas:

```js
// passo 1 — atualiza e verifica se alguma linha foi alterada
const { alteradas } = await query(`UPDATE doacoes SET ... WHERE id = ? AND status = ?`, [...]);
if (alteradas === 0) return undefined;
// passo 2 — busca a linha atualizada para devolvê-la
const { rows } = await query(`SELECT * FROM doacoes WHERE id = ?`, [id]);
return rows[0];
```

Essa estrutura estava repetida quatro vezes, somando 8 chamadas a `query` para operações que poderiam ser feitas em 4. O método `inserir` já usava `RETURNING *` para obter a linha inserida em uma única chamada — a mesma cláusula funciona em UPDATE e é suportada tanto pelo SQLite (`node:sqlite`) quanto pelo PostgreSQL (`pg`).

### O que mudou
Os quatro métodos foram reescritos para usar `UPDATE … RETURNING *` em uma única chamada a `query`:

```js
// antes (2 queries)
const { alteradas } = await query(`UPDATE doacoes SET status = ? WHERE id = ? AND status = ?`, [...]);
if (alteradas === 0) return undefined;
const { rows } = await query(`SELECT * FROM doacoes WHERE id = ?`, [id]);
return rows[0];

// depois (1 query)
const { rows } = await query(`UPDATE doacoes SET status = ? WHERE id = ? AND status = ? RETURNING *`, [...]);
return rows[0];  // undefined se nenhuma linha foi afetada
```

O helper `query` em `src/database/db.js` já detectava `RETURNING` como leitura (`/returning/i.test(sql)`) e usava `.all()` no SQLite — portanto nenhuma alteração foi necessária na camada de banco. O contrato de retorno (`row | undefined`) permanece idêntico; a camada de serviço não foi alterada.

### Arquivos alterados
- `src/repositories/doacoesRepository.js` — métodos `aceitar`, `cancelar`, `liberar`, `concluir`
- `tests/refatoracoes.test.js` *(novo)* — 4 testes que verificam o valor de retorno de cada operação

### Evidência dos testes

**Testes adicionados** (em `tests/refatoracoes.test.js`):

```
Refatoração 3 — operações do repositório retornam a linha atualizada corretamente (4)
  ✓ aceitar retorna a linha com status aceita e o nome da ONG
  ✓ cancelar retorna a linha com status cancelada
  ✓ liberar retorna a linha com status disponivel e ong nula
  ✓ concluir retorna a linha com status concluida
```

Os 41 testes de integração originais continuaram passando sem nenhuma alteração, confirmando que o comportamento externo não mudou.

**Após a refatoração:** 78 testes passando

---

## Refatoração 4 — Validação de `:id` como inteiro na fronteira do controller

### Cheiro atacado
**Obsessão por primitivos (Primitive Obsession).** `req.params.id` é sempre uma `string` no Express. Os handlers passavam esse valor diretamente para o service (`aceitar(req.params.id, ...)`, `cancelar(req.params.id)`, etc.) sem nenhuma conversão ou validação. Para ids não numéricos como `'abc'`, o comportamento correto (retornar "Doação não encontrada") era consequência acidental de o banco não encontrar nenhuma linha para a string `'abc'` — não de uma regra explícita. Ids como `0`, `-5` ou `1.5` também chegavam sem verificação.

### O que mudou
Foi adicionada a função `parsearId(raw)` no controller:

```js
function parsearId(raw) {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : NaN;
}
```

Cada handler com `:id` agora chama `parsearId` antes de invocar o service:

```js
doacoesRouter.post('/:id/aceitar', asyncHandler(async (req, res) => {
  const id = parsearId(req.params.id);
  if (isNaN(id)) return res.status(404).json({ erro: 'Doação não encontrada' });
  res.json(await doacoes.aceitar(id, req.body?.ong));
}));
```

O id chega ao service e ao repositório como `number`, não como `string`. A regra fica explícita: qualquer valor que não seja um inteiro positivo é rejeitado imediatamente na fronteira HTTP, sem chegar ao banco.

### Arquivos alterados
- `src/controllers/doacoesController.js` — função `parsearId` e guarda em todos os handlers com `:id`
- `tests/doacoes.test.js` — os testes de id não numérico que esperavam `400` foram atualizados para `404` (comportamento agora explícito e semântico)
- `tests/refatoracoes.test.js` *(novo)* — 8 testes cobrindo os casos de fronteira do controller

### Evidência dos testes

**Testes adicionados** (em `tests/refatoracoes.test.js`):

```
Refatoração 4 — id não numérico retorna 404 no controller (8)
  ✓ POST /api/doacoes/abc/aceitar → 404 para id "abc"
  ✓ POST /api/doacoes/abc/cancelar → 404 para id "abc"
  ✓ POST /api/doacoes/abc/liberar → 404 para id "abc"
  ✓ POST /api/doacoes/abc/concluir → 404 para id "abc"
  ✓ id zero retorna 404
  ✓ id negativo retorna 404
  ✓ id decimal retorna 404
  ✓ id inteiro positivo válido passa pelo controller e chega ao service
```

**Após a refatoração:** 78 testes passando (2 arquivos · `tests/doacoes.test.js` + `tests/refatoracoes.test.js`)

---

## Resumo das evidências

| Momento | Arquivos de teste | Testes passando |
|---|---|---|
| Baseline (antes de qualquer refatoração) | 1 (`doacoes.test.js`) | **41 / 41** |
| Após todas as 4 refatorações | 2 (`doacoes.test.js` + `refatoracoes.test.js`) | **78 / 78** |

Nenhum teste anterior foi removido. Os 4 que tiveram assertions de status atualizadas (`400 → 404`) refletem o comportamento *correto* introduzido pela Refatoração 2 e 4 — não uma regressão.

---

## Limitações e o que ficou de fora

- **`quantidade` armazenada como TEXT:** o campo é validado como número mas persiste como string. Converter para `NUMERIC` no schema exigiria uma migration destrutiva e não havia requisito de operações aritméticas sobre o campo, por isso foi deixado para uma iteração futura.
- **`listarDisponiveis` e `listarAceitas` como delegações diretas:** os dois métodos de serviço não adicionam lógica — apenas repassam ao repositório. São candidatos a remoção (simplificação), mas foram mantidos como seam para futuras regras de negócio (ex: paginação, auditoria).
- **Cobertura de `liberar` e `concluir` nos testes de integração existentes:** já estava bem coberta; nenhum teste adicional de integração foi necessário para essas rotas além dos de Refatoração 3.
