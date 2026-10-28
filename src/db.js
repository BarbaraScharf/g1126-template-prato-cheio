// Conexão com o banco.
import pg from 'pg';

const URL_PADRAO = 'postgres://pratocheio:pratocheio@localhost:5432/pratocheio';

let pool;

export function conexao() {
  if (!pool) pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || URL_PADRAO });
  return pool;
}

/**
 * Executa uma consulta e devolve { rows }.
 * Use `?` como marcador de parâmetro (evita injeção de SQL):
 *   query('SELECT * FROM doacoes WHERE id = ?', [id])
 */
export async function query(sql, valores = []) {
  let n = 0;
  const sqlPg = sql.replace(/\?/g, () => `$${++n}`);
  const resultado = await conexao().query(sqlPg, valores);
  return { rows: resultado.rows, alteradas: resultado.rowCount };
}

/** Cria o schema, se ainda não existir. Rodado por `npm run db:migrar` e ao subir o servidor. */
export async function migrar() {
  await conexao().query(`
    CREATE TABLE IF NOT EXISTS doacoes (
      id          SERIAL PRIMARY KEY,
      tipo        TEXT NOT NULL,
      quantidade  TEXT NOT NULL,
      validade    TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'disponivel',
      ong         TEXT,
      criada_em   TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

/** Apaga todos os dados. Usado pelos testes. */
export async function limparBanco() {
  await conexao().query('DELETE FROM doacoes');
}

export async function encerrar() {
  if (pool) { await pool.end(); pool = undefined; }
}
