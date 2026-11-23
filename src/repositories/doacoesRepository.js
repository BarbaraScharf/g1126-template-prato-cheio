// Camada de dados do Prato Cheio — acesso ao banco.
import { query } from '../database/db.js';
import { STATUS } from '../status.js';

// Insere a doação e devolve a linha criada.
export async function inserir({ tipo, quantidade, validade }) {
  const { rows } = await query(
    `INSERT INTO doacoes (tipo, quantidade, validade) VALUES (?, ?, ?) RETURNING *`,
    [tipo, quantidade, validade]
  );
  return rows[0];
}

// Busca uma doação pelo id (devolve undefined se não existir).
export async function buscarPorId(id) {
  const { rows } = await query(
    `SELECT * FROM doacoes WHERE id = ?`,
    [id]
  );
  return rows[0];
}

/**
 * Atualização condicional com RETURNING *:
 * Só muda o status se ainda estiver no status esperado — garante que duas ONGs
 * não aceitem a mesma doação (sem lock extra) e elimina o segundo SELECT
 * que existia antes desta refatoração.
 * Devolve a linha atualizada ou undefined se nenhuma linha foi afetada.
 */
export async function aceitar(id, ong) {
  const { rows } = await query(
    `UPDATE doacoes SET status = ?, ong = ? WHERE id = ? AND status = ? RETURNING *`,
    [STATUS.ACEITA, ong, id, STATUS.DISPONIVEL]
  );
  return rows[0];
}

// Cancela uma doação, mas só se ainda estiver 'disponivel'. Devolve a linha ou undefined.
export async function cancelar(id) {
  const { rows } = await query(
    `UPDATE doacoes SET status = ? WHERE id = ? AND status = ? RETURNING *`,
    [STATUS.CANCELADA, id, STATUS.DISPONIVEL]
  );
  return rows[0];
}

// Lista doações disponíveis filtrando opcionalmente por tipo.
// A comparação é insensível a maiúsculas/minúsculas.
export async function listarDisponiveisPorTipo(tipo) {
  if (!tipo) {
    const { rows } = await query(
      `SELECT * FROM doacoes WHERE status = ? ORDER BY criada_em ASC`,
      [STATUS.DISPONIVEL]
    );
    return rows;
  }
  const { rows } = await query(
    `SELECT * FROM doacoes WHERE status = ? AND LOWER(tipo) = LOWER(?) ORDER BY criada_em ASC`,
    [STATUS.DISPONIVEL, tipo]
  );
  return rows;
}

// Lista doações aceitas e concluídas (aba "Reservadas / Concluídas" do frontend).
export async function listarAceitas() {
  const { rows } = await query(
    `SELECT * FROM doacoes WHERE status IN (?, ?) ORDER BY criada_em ASC`,
    [STATUS.ACEITA, STATUS.CONCLUIDA]
  );
  return rows;
}

// Libera a reserva: volta o status de 'aceita' para 'disponivel' e limpa a ONG.
// Devolve a linha atualizada ou undefined se a doação não estava aceita.
export async function liberar(id) {
  const { rows } = await query(
    `UPDATE doacoes SET status = ?, ong = NULL WHERE id = ? AND status = ? RETURNING *`,
    [STATUS.DISPONIVEL, id, STATUS.ACEITA]
  );
  return rows[0];
}

// Conclui a retirada: muda o status de 'aceita' para 'concluida'.
// Devolve a linha atualizada ou undefined se a doação não estava aceita.
export async function concluir(id) {
  const { rows } = await query(
    `UPDATE doacoes SET status = ? WHERE id = ? AND status = ? RETURNING *`,
    [STATUS.CONCLUIDA, id, STATUS.ACEITA]
  );
  return rows[0];
}
