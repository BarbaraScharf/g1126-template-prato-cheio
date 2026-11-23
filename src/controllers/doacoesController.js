import express from 'express';
import * as doacoes from '../services/doacoesService.js';
import { NotFoundError } from '../services/doacoesService.js';

export const doacoesRouter = express.Router();

/**
 * Envolve um handler assíncrono capturando erros e mapeando-os para o status HTTP correto:
 *   NotFoundError       → 404 { erro: mensagem }
 *   qualquer outro erro → 400 { erro: mensagem }
 */
const asyncHandler = fn => async (req, res) => {
  try {
    await fn(req, res);
  } catch (erro) {
    const status = erro instanceof NotFoundError ? 404 : 400;
    res.status(status).json({ erro: erro.message });
  }
};

/**
 * Converte req.params.id para inteiro.
 * Devolve NaN se o valor não for um número inteiro válido.
 */
function parsearId(raw) {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : NaN;
}

// H2 e H5 — lista doações disponíveis, com filtro opcional por tipo
doacoesRouter.get('/', asyncHandler(async (req, res) => {
  res.json(await doacoes.listarDisponiveis(req.query.tipo));
}));

// Lista doações aceitas/reservadas ou concluídas (Aba Reservadas)
doacoesRouter.get('/aceitas', asyncHandler(async (req, res) => {
  res.json(await doacoes.listarAceitas());
}));

// H1 — publica uma doação
doacoesRouter.post('/', asyncHandler(async (req, res) => {
  res.status(201).json(await doacoes.criarDoacao(req.body));
}));

// H3 — ONG aceita uma doação disponível
doacoesRouter.post('/:id/aceitar', asyncHandler(async (req, res) => {
  const id = parsearId(req.params.id);
  if (isNaN(id)) return res.status(404).json({ erro: 'Doação não encontrada' });
  res.json(await doacoes.aceitar(id, req.body?.ong));
}));

// H4 — doador cancela uma doação
doacoesRouter.post('/:id/cancelar', asyncHandler(async (req, res) => {
  const id = parsearId(req.params.id);
  if (isNaN(id)) return res.status(404).json({ erro: 'Doação não encontrada' });
  res.json(await doacoes.cancelar(id));
}));

// Liberar reserva (volta para disponíveis)
doacoesRouter.post('/:id/liberar', asyncHandler(async (req, res) => {
  const id = parsearId(req.params.id);
  if (isNaN(id)) return res.status(404).json({ erro: 'Doação não encontrada' });
  res.json(await doacoes.liberar(id));
}));

// Concluir retirada da doação
doacoesRouter.post('/:id/concluir', asyncHandler(async (req, res) => {
  const id = parsearId(req.params.id);
  if (isNaN(id)) return res.status(404).json({ erro: 'Doação não encontrada' });
  res.json(await doacoes.concluir(id));
}));
