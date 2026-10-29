// Camada de dados do Prato Cheio — acesso ao banco.
import { query } from '../database/db.js';

// Insere a doação e devolve a linha criada.
export async function inserir({ tipo, quantidade, validade }) {
  const { rows } = await query(
    `INSERT INTO doacoes (tipo, quantidade, validade) VALUES ($1, $2, $3) RETURNING *`,
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

// Devolve doações que já foram aceitas ou concluídas (para a aba de Reservadas).
export async function listarAceitas() {
  const { rows } = await query(
    `SELECT * FROM doacoes WHERE status IN ('aceita', 'concluida') ORDER BY criada_em ASC`
  );
  return rows;
}

// Busca uma doação pelo id (devolve undefined se não existir).
export async function buscarPorId(id) {
  const { rows } = await query(
    `SELECT * FROM doacoes WHERE id = $1`,
    [id]
  );
  return rows[0];
}

// Atualização condicional: só muda o status se ainda estiver 'disponivel'.
export async function aceitar(id, ong) {
  const resultado = await query(
    `UPDATE doacoes SET status = 'aceita', ong = $1 WHERE id = $2 AND status = 'disponivel'`,
    [ong, id]
  );
  if (resultado.rowCount === 0) return undefined;
  
  const { rows } = await query(`SELECT * FROM doacoes WHERE id = $1`, [id]);
  return rows[0];
}

// Cancela uma doação, mas só se ainda estiver 'disponivel'.
export async function cancelar(id) {
  const resultado = await query(
    `UPDATE doacoes SET status = 'cancelada' WHERE id = $1 AND status = 'disponivel'`,
    [id]
  );
  if (resultado.rowCount === 0) return undefined;
  
  const { rows } = await query(`SELECT * FROM doacoes WHERE id = $1`, [id]);
  return rows[0];
}

// Libera a reserva de volta para 'disponivel'.
export async function liberar(id) {
  const resultado = await query(
    `UPDATE doacoes SET status = 'disponivel', ong = NULL WHERE id = $1 AND status = 'aceita'`,
    [id]
  );
  if (resultado.rowCount === 0) return undefined;
  
  const { rows } = await query(`SELECT * FROM doacoes WHERE id = $1`, [id]);
  return rows[0];
}

// Conclui a retirada da doação.
export async function concluir(id) {
  const resultado = await query(
    `UPDATE doacoes SET status = 'concluida' WHERE id = $1 AND status = 'aceita'`,
    [id]
  );
  if (resultado.rowCount === 0) return undefined;
  
  const { rows } = await query(`SELECT * FROM doacoes WHERE id = $1`, [id]);
  return rows[0];
}

// Lista doações disponíveis filtrando opcionalmente por tipo.
export async function listarDisponiveisPorTipo(tipo) {
  if (!tipo) {
    return listarDisponiveis();
  }
  const { rows } = await query(
    `SELECT * FROM doacoes WHERE status = 'disponivel' AND LOWER(tipo) = LOWER($1) ORDER BY criada_em ASC`,
    [tipo]
  );
  return rows;
}