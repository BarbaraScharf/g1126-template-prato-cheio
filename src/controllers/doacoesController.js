import express from 'express';
import * as doacoes from '../services/doacoesService.js';

export const doacoesRouter = express.Router();

// H2 e H5 — lista doações disponíveis, com filtro opcional por tipo
doacoesRouter.get('/', async (req, res) => {
  try {
    res.json(await doacoes.listarDisponiveis(req.query.tipo));
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
});

// Lista doações aceitas/reservadas ou concluídas (Aba Reservadas)
doacoesRouter.get('/aceitas', async (req, res) => {
  try {
    res.json(await doacoes.listarAceitas());
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
});

// H1 — publica uma doação
doacoesRouter.post('/', async (req, res) => {
  try {
    res.status(201).json(await doacoes.criarDoacao(req.body));
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
});

// H3 — ONG aceita uma doação disponível
doacoesRouter.post('/:id/aceitar', async (req, res) => {
  try {
    res.json(await doacoes.aceitar(req.params.id, req.body?.ong ?? 'ONG'));
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
});

// H4 — doador cancela uma doação
doacoesRouter.post('/:id/cancelar', async (req, res) => {
  try {
    res.json(await doacoes.cancelar(req.params.id));
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
});

// Liberar reserva (volta para disponíveis)
doacoesRouter.post('/:id/liberar', async (req, res) => {
  try {
    res.json(await doacoes.liberar(req.params.id));
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
});

// Concluir retirada da doação
doacoesRouter.post('/:id/concluir', async (req, res) => {
  try {
    res.json(await doacoes.concluir(req.params.id));
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
});