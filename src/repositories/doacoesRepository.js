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

// Atualização condicional: só muda o status se ainda estiver 'disponivel'.
// Garante que duas ONGs não aceitem a mesma doação (sem lock extra).
export async function aceitar(id, ong) {
  const { alteradas } = await query(
    `UPDATE doacoes SET status = ?, ong = ? WHERE id = ? AND status = ?`,
    [STATUS.ACEITA, ong, id, STATUS.DISPONIVEL]
  );
  if (alteradas === 0) return undefined;
  const { rows } = await query(`SELECT * FROM doacoes WHERE id = ?`, [id]);
  return rows[0];
}

// Cancela uma doação, mas só se ainda estiver 'disponivel'.
export async function cancelar(id) {
  const { alteradas } = await query(
    `UPDATE doacoes SET status = ? WHERE id = ? AND status = ?`,
    [STATUS.CANCELADA, id, STATUS.DISPONIVEL]
  );
  if (alteradas === 0) return undefined;
  const { rows } = await query(`SELECT * FROM doacoes WHERE id = ?`, [id]);
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
export async function liberar(id) {
  const { alteradas } = await query(
    `UPDATE doacoes SET status = ?, ong = NULL WHERE id = ? AND status = ?`,
    [STATUS.DISPONIVEL, id, STATUS.ACEITA]
  );
  if (alteradas === 0) return undefined;
  const { rows } = await query(`SELECT * FROM doacoes WHERE id = ?`, [id]);
  return rows[0];
}

// Conclui a retirada: muda o status de 'aceita' para 'concluida'.
export async function concluir(id) {
  const { alteradas } = await query(
    `UPDATE doacoes SET status = ? WHERE id = ? AND status = ?`,
    [STATUS.CONCLUIDA, id, STATUS.ACEITA]
  );
  if (alteradas === 0) return undefined;
  const { rows } = await query(`SELECT * FROM doacoes WHERE id = ?`, [id]);
  return rows[0];
}
