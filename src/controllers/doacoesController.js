import express from 'express';
import * as doacoes from '../services/doacoesService.js';

export const doacoesRouter = express.Router();

doacoesRouter.get('/', async (req, res) => {
  try {
    res.json(await doacoes.listarDisponiveis());
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
});

doacoesRouter.post('/', async (req, res) => {
  try {
    res.status(201).json(await doacoes.criarDoacao(req.body));
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
});

doacoesRouter.post('/:id/aceitar', async (req, res) => {
  try {
    res.json(await doacoes.aceitar(req.params.id, req.body?.ong ?? 'ONG'));
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
});
