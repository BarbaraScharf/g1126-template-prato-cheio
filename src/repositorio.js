// Camada de dados do Prato Cheio — acesso ao banco.
import { query } from './db.js';

// Insere a doação e devolve a linha criada.
export async function inserir({ tipo, quantidade, validade }) {
  const { rows } = await query(
    `INSERT INTO doacoes (tipo, quantidade, validade) VALUES (?, ?, ?) RETURNING *`,
    [tipo, quantidade, validade]
  );
  return rows[0];
}

// Devolve apenas as doações com status 'disponivel'.
export async function listarDisponiveis() {
  const { rows } = await query(
    `SELECT * FROM doacoes WHERE status = 'disponivel' ORDER BY criada_em ASC`
  );
  return rows;
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
    `UPDATE doacoes SET status = 'aceita', ong = ? WHERE id = ? AND status = 'disponivel'`,
    [ong, id]
  );
  if (alteradas === 0) return undefined; // já aceita ou não existe
  const { rows } = await query(`SELECT * FROM doacoes WHERE id = ?`, [id]);
  return rows[0];
}

// História 4 — cancela uma doação, mas só se ainda estiver 'disponivel'.
// Doações aceitas não podem ser canceladas.
export async function cancelar(id) {
  const { alteradas } = await query(
    `UPDATE doacoes SET status = 'cancelada' WHERE id = ? AND status = 'disponivel'`,
    [id]
  );
  if (alteradas === 0) return undefined;
  const { rows } = await query(`SELECT * FROM doacoes WHERE id = ?`, [id]);
  return rows[0];
}

// História 5 — lista doações disponíveis filtrando opcionalmente por tipo.
// A comparação é insensível a maiúsculas/minúsculas.
export async function listarDisponiveisPorTipo(tipo) {
  if (!tipo) {
    const { rows } = await query(
      `SELECT * FROM doacoes WHERE status = 'disponivel' ORDER BY criada_em ASC`
    );
    return rows;
  }
  const { rows } = await query(
    `SELECT * FROM doacoes WHERE status = 'disponivel' AND LOWER(tipo) = LOWER(?) ORDER BY criada_em ASC`,
    [tipo]
  );
  return rows;
}
