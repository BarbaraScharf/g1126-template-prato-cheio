import express from 'express';
import * as doacoes from './doacoes.js';

export function criarApp() {
  const app = express();
  app.use(express.json());
  app.use(express.static('public'));

  // Verificação de saúde: usada pelo CI para provar que a aplicação sobe.
  app.get('/api/saude', (req, res) => res.json({ ok: true }));

  // Histórias 2 e 5 — lista doações disponíveis, com filtro opcional por tipo.
  // GET /api/doacoes          → todas as disponíveis
  // GET /api/doacoes?tipo=Arroz → só as do tipo informado (insensível a maiúsculas)
  app.get('/api/doacoes', async (req, res) => {
    try {
      res.json(await doacoes.listarDisponiveis(req.query.tipo));
    } catch (erro) {
      res.status(400).json({ erro: erro.message });
    }
  });

  // História 1 — publica uma doação.
  app.post('/api/doacoes', async (req, res) => {
    try {
      res.status(201).json(await doacoes.criarDoacao(req.body));
    } catch (erro) {
      res.status(400).json({ erro: erro.message });
    }
  });

  // História 3 — ONG aceita uma doação disponível.
  app.post('/api/doacoes/:id/aceitar', async (req, res) => {
    try {
      res.json(await doacoes.aceitar(req.params.id, req.body?.ong ?? 'ONG'));
    } catch (erro) {
      res.status(400).json({ erro: erro.message });
    }
  });

  // História 4 — doador cancela uma doação disponível.
  // DELETE /api/doacoes/:id
  app.delete('/api/doacoes/:id', async (req, res) => {
    try {
      res.json(await doacoes.cancelar(req.params.id));
    } catch (erro) {
      res.status(400).json({ erro: erro.message });
    }
  });

  return app;
}
