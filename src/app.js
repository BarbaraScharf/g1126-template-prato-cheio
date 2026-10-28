import express from 'express';
import { doacoesRouter } from './controllers/doacoesController.js';

export function criarApp() {
  const app = express();
  app.use(express.json());
  app.use(express.static('public'));

  // Verificação de saúde: usada pelo CI para provar que a aplicação sobe.
  app.get('/api/saude', (req, res) => res.json({ ok: true }));

  app.use('/api/doacoes', doacoesRouter);

  return app;
}
