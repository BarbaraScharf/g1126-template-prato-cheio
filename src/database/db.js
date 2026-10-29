// Conexão com o banco.
//
// TESTES: se DATABASE_FILE estiver definido, usa SQLite em memória (node:sqlite).
// PRODUÇÃO / CI com Docker: usa PostgreSQL via DATABASE_URL.
//
// Isso permite rodar os testes sem Docker, mantendo a migração para PostgreSQL
// funcional quando o container está disponível.

import { createRequire } from 'node:module';
import pg from 'pg';

const usarSQLite = !!process.env.DATABASE_FILE;

// ─── SQLite ───────────────────────────────────────────────────────────────────
let sqliteDb;

function obterSQLite() {
  if (!sqliteDb) {
    const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite');
    const arquivo = process.env.DATABASE_FILE || ':memory:';
    sqliteDb = new DatabaseSync(arquivo);
  }
  return sqliteDb;
}

// ─── PostgreSQL ───────────────────────────────────────────────────────────────
const URL_PADRAO = 'postgres://pratocheio:pratocheio@localhost:5432/pratocheio';
let pool;

function obterPG() {
  if (!pool) pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || URL_PADRAO });
  return pool;
}

// ─── Interface unificada ──────────────────────────────────────────────────────

export async function query(sql, valores = []) {
  if (usarSQLite) {
    const db = obterSQLite();
    const stmt = db.prepare(sql);
    const ehLeitura = /^\s*(select|with)/i.test(sql) || /returning/i.test(sql);
    if (ehLeitura) return { rows: stmt.all(...valores) };
    const info = stmt.run(...valores);
    return { rows: [], alteradas: info.changes };
  }

  let n = 0;
  const sqlPg = sql.replace(/\?/g, () => `$${++n}`);
  const resultado = await obterPG().query(sqlPg, valores);
  return { rows: resultado.rows, alteradas: resultado.rowCount };
}

export async function migrar() {
  if (usarSQLite) {
    obterSQLite().exec(`
      CREATE TABLE IF NOT EXISTS doacoes (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo        TEXT NOT NULL,
        quantidade  TEXT NOT NULL,
        validade    TEXT NOT NULL,
        status      TEXT NOT NULL DEFAULT 'disponivel',
        ong         TEXT,
        criada_em   TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    return;
  }

  await obterPG().query(`
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

export async function limparBanco() {
  if (usarSQLite) {
    obterSQLite().exec('DELETE FROM doacoes');
    return;
  }
  await obterPG().query('DELETE FROM doacoes');
}

export async function encerrar() {
  if (usarSQLite) {
    if (sqliteDb) { sqliteDb.close(); sqliteDb = undefined; }
    return;
  }
  if (pool) { await pool.end(); pool = undefined; }
}
