// Camada de dados do Prato Cheio — acesso ao banco.
import { query } from './db.js';

export async function inserir({ tipo, quantidade, validade }) {
  const { rows } = await query(
    `INSERT INTO doacoes (tipo, quantidade, validade) VALUES (?, ?, ?) RETURNING *`,
    [tipo, quantidade, validade]
  );
  return rows[0];
}

export async function listarDisponiveis(tipoFiltro) {
  if (tipoFiltro) {
    const { rows } = await query(
      `SELECT * FROM doacoes WHERE status = 'disponivel' AND LOWER(tipo) LIKE LOWER(?) ORDER BY criada_em ASC`,
      [`%${tipoFiltro}%`]
    );
    return rows;
  }
  const { rows } = await query(
    `SELECT * FROM doacoes WHERE status = 'disponivel' ORDER BY criada_em ASC`
  );
  return rows;
}

export async function listarAceitas(ong) {
  if (ong) {
    const { rows } = await query(
      `SELECT * FROM doacoes WHERE status IN ('aceita', 'concluida') AND LOWER(ong) = LOWER(?) ORDER BY criada_em DESC`,
      [ong]
    );
    return rows;
  }
  const { rows } = await query(
    `SELECT * FROM doacoes WHERE status IN ('aceita', 'concluida') ORDER BY criada_em DESC`
  );
  return rows;
}

export async function buscarPorId(id) {
  const { rows } = await query(
    `SELECT * FROM doacoes WHERE id = ?`,
    [id]
  );
  return rows[0];
}

export async function aceitar(id, ong) {
  const { alteradas } = await query(
    `UPDATE doacoes SET status = 'aceita', ong = ? WHERE id = ? AND status = 'disponivel'`,
    [ong, id]
  );
  if (alteradas === 0) return undefined;
  const { rows } = await query(`SELECT * FROM doacoes WHERE id = ?`, [id]);
  return rows[0];
}

export async function cancelar(id) {
  const { alteradas } = await query(
    `UPDATE doacoes SET status = 'cancelada' WHERE id = ? AND status = 'disponivel'`,
    [id]
  );
  if (alteradas === 0) return undefined;
  const { rows } = await query(`SELECT * FROM doacoes WHERE id = ?`, [id]);
  return rows[0];
}

export async function concluir(id) {
  const { alteradas } = await query(
    `UPDATE doacoes SET status = 'concluida' WHERE id = ? AND status = 'aceita'`,
    [id]
  );
  if (alteradas === 0) return undefined;
  const { rows } = await query(`SELECT * FROM doacoes WHERE id = ?`, [id]);
  return rows[0];
}

// Devolve uma doação 'aceita' para a lista de 'disponivel' caso a ONG não possa retirar.
export async function liberarReserva(id) {
  const { alteradas } = await query(
    `UPDATE doacoes SET status = 'disponivel', ong = NULL WHERE id = ? AND status = 'aceita'`,
    [id]
  );
  if (alteradas === 0) return undefined;
  const { rows } = await query(`SELECT * FROM doacoes WHERE id = ?`, [id]);
  return rows[0];
}