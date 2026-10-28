import express from 'express';
import * as doacoes from './doacoes.js';

export function criarApp() {
  const app = express();
  app.use(express.json());
  app.use(express.static('public'));

  app.get('/api/saude', (req, res) => res.json({ ok: true }));

  app.get('/api/doacoes', async (req, res) => {
    try { 
      res.json(await doacoes.listarDisponiveis(req.query.tipo));
    } catch (erro) {
      res.status(400).json({ erro: erro.message });
    }
  });

  // ROTA NOVA: Lista as doações reservadas/concluídas pelas ONGs
  app.get('/api/doacoes/aceitas', async (req, res) => {
    try {
      res.json(await doacoes.listarAceitas(req.query.ong));
    } catch (erro) {
      res.status(400).json({ erro: erro.message });
    }
  });

  app.post('/api/doacoes', async (req, res) => {
    try {
      res.status(201).json(await doacoes.criarDoacao(req.body));
    } catch (erro) {
      res.status(400).json({ erro: erro.message });
    }
  });

  app.post('/api/doacoes/:id/aceitar', async (req, res) => {
    try {
      res.json(await doacoes.aceitar(req.params.id, req.body?.ong ?? 'ONG'));
    } catch (erro) {
      res.status(400).json({ erro: erro.message });
    }
  });

  // ROTA NOVA: Cancelar doação disponível
  app.post('/api/doacoes/:id/cancelar', async (req, res) => {
    try {
      res.json(await doacoes.cancelar(req.params.id));
    } catch (erro) {
      res.status(400).json({ erro: erro.message });
    }
  });

  // ROTA NOVA: Confirmar retirada (concluir)
  app.post('/api/doacoes/:id/concluir', async (req, res) => {
    try {
      res.json(await doacoes.concluir(req.params.id));
    } catch (erro) {
      res.status(400).json({ erro: erro.message });
    }
  });

  app.post('/api/doacoes/:id/liberar', async (req, res) => {
    try {
      res.json(await doacoes.liberarReserva(req.params.id));
    } catch (erro) {
      res.status(400).json({ erro: erro.message });
    }
  });

  return app;
}