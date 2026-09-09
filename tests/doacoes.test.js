import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { criarApp } from '../src/app.js';
import { migrar, limparBanco, encerrar } from '../src/db.js';

const app = criarApp();

// Este teste já passa e não depende do banco:
// prova que a aplicação sobe e que o CI está funcionando.
describe('a aplicação sobe', () => {
  it('responde na verificação de saúde', async () => {
    const res = await request(app).get('/api/saude');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Walking skeleton — critérios de aceite das 3 histórias.
// Banco: SQLite em memória (DATABASE_FILE=:memory: via vitest.config.js).
// ---------------------------------------------------------------------------

describe('publicar e listar doações', () => {
  beforeEach(async () => {
    await migrar();
    await limparBanco();
  });

  afterAll(async () => {
    await encerrar();
  });

  // História 1 / Critério: publicação com sucesso
  // Dado que o doador preencheu tipo, quantidade e validade
  // Quando ele confirma a publicação
  // Então a doação aparece na lista com status "disponivel"
  it('mostra a doação publicada na lista de disponíveis', async () => {
    await request(app)
      .post('/api/doacoes')
      .send({
        tipo: 'Sopa',
        quantidade: '10 porções',
        validade: '2026-12-01'
      })
      .expect(201);

    const res = await request(app).get('/api/doacoes');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].tipo).toBe('Sopa');
    expect(res.body[0].status).toBe('disponivel');
  });

  // História 1 / Critério: campo obrigatório ausente
  // Dado que falta um campo obrigatório
  // Quando o doador tenta publicar
  // Então o sistema impede e indica o que falta
  it('recusa doação sem os campos obrigatórios', async () => {
    const res = await request(app)
      .post('/api/doacoes')
      .send({ tipo: 'Arroz' });

    expect(res.status).toBe(400);
    expect(res.body.erro).toMatch(/quantidade/);
    expect(res.body.erro).toMatch(/validade/);
  });

  // História 2 / Critério: lista vazia
  // Dado que não há doações disponíveis
  // Quando a ONG acessa a lista
  // Então o sistema retorna lista vazia
  it('retorna lista vazia quando não há doações disponíveis', async () => {
    const res = await request(app).get('/api/doacoes');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });
});

describe('aceitar uma doação', () => {
  beforeEach(async () => {
    await migrar();
    await limparBanco();
  });

  afterAll(async () => {
    await encerrar();
  });

  // Helper: publica uma doação e devolve o id criado
  async function publicarDoacao(tipo = 'Feijão') {
    const res = await request(app)
      .post('/api/doacoes')
      .send({
        tipo,
        quantidade: '5 kg',
        validade: '2026-12-01'
      });

    return res.body.id;
  }

  // História 3 / Critério: aceite com sucesso
  // Dado que a doação está "disponivel"
  // Quando a ONG confirma o aceite
  // Então o status muda para "aceita"
  it('marca a doação como aceita pela ONG', async () => {
    const id = await publicarDoacao();

    const res = await request(app)
      .post(`/api/doacoes/${id}/aceitar`)
      .send({ ong: 'ONG Esperança' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('aceita');
    expect(res.body.ong).toBe('ONG Esperança');
  });

  // História 2 / Critério: doação já aceita some da lista
  // Dado que uma doação foi aceita por uma ONG
  // Quando qualquer ONG acessa a lista
  // Então essa doação não aparece mais
  it('remove a doação da lista de disponíveis depois de aceita', async () => {
    const id = await publicarDoacao();

    await request(app)
      .post(`/api/doacoes/${id}/aceitar`)
      .send({ ong: 'ONG Esperança' });

    const res = await request(app).get('/api/doacoes');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  // História 3 / Critério: doação já aceita por outra ONG
  // Dado que outra ONG já aceitou a doação
  // Quando uma segunda ONG tenta aceitá-la
  // Então o sistema impede e informa que ela não está mais disponível
  it('recusa aceitar uma doação que já foi aceita por outra ONG', async () => {
    const id = await publicarDoacao();

    await request(app)
      .post(`/api/doacoes/${id}/aceitar`)
      .send({ ong: 'ONG Esperança' });

    const res = await request(app)
      .post(`/api/doacoes/${id}/aceitar`)
      .send({ ong: 'ONG Solidária' });

    expect(res.status).toBe(400);
    expect(res.body.erro).toMatch(/não está mais disponível/);
  });

  // Nova regra: o nome da ONG é obrigatório para aceitar uma doação.
  it('recusa aceitar uma doação sem informar o nome da ONG', async () => {
    const id = await publicarDoacao();

    const res = await request(app)
      .post(`/api/doacoes/${id}/aceitar`)
      .send({ ong: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.erro).toBe('Nome da ONG é obrigatório');
  });
});