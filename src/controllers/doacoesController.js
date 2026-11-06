import express from 'express';
import * as doacoes from '../services/doacoesService.js';

export const doacoesRouter = express.Router();

// Elimina o try/catch duplicado em todos os handlers.
// Qualquer exceção lançada pelo service vira automaticamente um 400 com { erro: mensagem }.
const asyncHandler = fn => async (req, res) => {
  try {
    await fn(req, res);
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
};

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
  res.json(await doacoes.aceitar(req.params.id, req.body?.ong));
}));

// H4 — doador cancela uma doação
doacoesRouter.post('/:id/cancelar', asyncHandler(async (req, res) => {
  res.json(await doacoes.cancelar(req.params.id));
}));

// Liberar reserva (volta para disponíveis)
doacoesRouter.post('/:id/liberar', asyncHandler(async (req, res) => {
  res.json(await doacoes.liberar(req.params.id));
}));

// Concluir retirada da doação
doacoesRouter.post('/:id/concluir', asyncHandler(async (req, res) => {
  res.json(await doacoes.concluir(req.params.id));
}));
