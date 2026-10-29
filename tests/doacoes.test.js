import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { criarApp } from '../src/app.js';
import { migrar, limparBanco, encerrar } from '../src/database/db.js';

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

  // História 1 / Critério: tipo com números é inválido
  it('recusa doação com números no tipo de alimento', async () => {
    const res = await request(app)
      .post('/api/doacoes')
      .send({ tipo: 'Arroz123', quantidade: '5 kg', validade: '2026-12-01' });

    expect(res.status).toBe(400);
    expect(res.body.erro).toMatch(/não pode conter números/);
  });

  // História 1 / Critério: validade no passado
  // Dado que o doador informou uma data que já passou
  // Quando ele tenta publicar
  // Então o sistema rejeita com mensagem clara
  it('recusa doação com validade no passado', async () => {
    const res = await request(app)
      .post('/api/doacoes')
      .send({ tipo: 'Sopa', quantidade: '5 porções', validade: '2020-01-01' });

    expect(res.status).toBe(400);
    expect(res.body.erro).toMatch(/data futura/);
  });

  // História 1 / Critério: validade hoje é válida (retirada no mesmo dia)
  it('aceita doação com validade igual à data de hoje', async () => {
    const hoje = new Date().toISOString().slice(0, 10);

    const res = await request(app)
      .post('/api/doacoes')
      .send({ tipo: 'Sopa', quantidade: '5 porções', validade: hoje });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('disponivel');
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

// ---------------------------------------------------------------------------
// História 4 — Doador cancela uma doação disponível
// ---------------------------------------------------------------------------

describe('cancelar uma doação', () => {
  beforeEach(async () => {
    await migrar();
    await limparBanco();
  });

  afterAll(async () => {
    await encerrar();
  });

  // Helper: publica uma doação e devolve o id criado
  async function publicarDoacao(tipo = 'Arroz') {
    const res = await request(app)
      .post('/api/doacoes')
      .send({ tipo, quantidade: '3 kg', validade: '2026-12-01' });
    return res.body.id;
  }

  // Critério: cancelamento com sucesso
  // Dado que a doação está disponível
  // Quando o doador cancela
  // Então o status muda para 'cancelada'
  it('muda o status para cancelada quando a doação está disponível', async () => {
    const id = await publicarDoacao();

    const res = await request(app).delete(`/api/doacoes/${id}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelada');
    expect(res.body.id).toBe(id);
  });

  // Critério: doação cancelada some da lista
  // Dado que o doador cancelou a doação
  // Quando a ONG acessa a lista
  // Então a doação não aparece mais
  it('remove a doação da lista de disponíveis depois de cancelada', async () => {
    const id = await publicarDoacao();

    await request(app).delete(`/api/doacoes/${id}`);

    const res = await request(app).get('/api/doacoes');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  // Critério: não pode cancelar doação já aceita por uma ONG
  // Dado que uma ONG já aceitou a doação
  // Quando o doador tenta cancelar
  // Então o sistema recusa com erro informativo
  it('recusa cancelar uma doação que já foi aceita por uma ONG', async () => {
    const id = await publicarDoacao();

    await request(app)
      .post(`/api/doacoes/${id}/aceitar`)
      .send({ ong: 'ONG Esperança' });

    const res = await request(app).delete(`/api/doacoes/${id}`);

    expect(res.status).toBe(400);
    expect(res.body.erro).toMatch(/já aceita por uma ONG/);
  });

  // Critério: cancelar id inexistente retorna erro
  // Dado que o id não existe no banco
  // Quando o doador tenta cancelar
  // Então o sistema retorna 400 com mensagem clara
  it('retorna erro ao tentar cancelar uma doação inexistente', async () => {
    const res = await request(app).delete('/api/doacoes/9999');

    expect(res.status).toBe(400);
    expect(res.body.erro).toMatch(/não encontrada/);
  });
});

// ---------------------------------------------------------------------------
// História 5 — ONG filtra doações disponíveis por tipo de alimento
// ---------------------------------------------------------------------------

describe('filtrar doações por tipo', () => {
  beforeEach(async () => {
    await migrar();
    await limparBanco();
  });

  afterAll(async () => {
    await encerrar();
  });

  // Helper: publica uma doação com tipo específico
  async function publicar(tipo, quantidade = '2 kg') {
    await request(app)
      .post('/api/doacoes')
      .send({ tipo, quantidade, validade: '2026-12-01' });
  }

  // Critério: filtro retorna só as doações do tipo informado
  // Dado que existem doações de tipos diferentes
  // Quando a ONG filtra por um tipo
  // Então o sistema retorna só as que batem
  it('retorna apenas as doações do tipo solicitado', async () => {
    await publicar('Arroz');
    await publicar('Feijão');
    await publicar('Arroz');

    const res = await request(app).get('/api/doacoes?tipo=Arroz');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body.every(d => d.tipo === 'Arroz')).toBe(true);
  });

  // Critério: filtro é insensível a maiúsculas/minúsculas
  // Dado que há uma doação do tipo 'Arroz'
  // Quando a ONG filtra por 'arroz' (minúsculo)
  // Então o sistema encontra a doação normalmente
  it('encontra doações independentemente de maiúsculas ou minúsculas', async () => {
    await publicar('Arroz');

    const res = await request(app).get('/api/doacoes?tipo=arroz');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].tipo).toBe('Arroz');
  });

  // Critério: tipo sem correspondência retorna lista vazia
  // Dado que não há doações do tipo informado
  // Quando a ONG filtra
  // Então o sistema retorna []
  it('retorna lista vazia quando nenhuma doação bate com o tipo', async () => {
    await publicar('Arroz');

    const res = await request(app).get('/api/doacoes?tipo=Macarrão');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  // Critério: sem parâmetro retorna todas as disponíveis (comportamento original H2)
  // Dado que existem doações de tipos variados
  // Quando a ONG acessa sem filtro
  // Então o sistema retorna todas as disponíveis
  it('retorna todas as disponíveis quando nenhum filtro é aplicado', async () => {
    await publicar('Arroz');
    await publicar('Feijão');
    await publicar('Sopa');

    const res = await request(app).get('/api/doacoes');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
  });

  // Critério: doações canceladas não aparecem mesmo que batam com o tipo
  // Dado que uma doação do tipo 'Arroz' foi cancelada
  // Quando a ONG filtra por 'Arroz'
  // Então a doação cancelada não aparece
  it('não inclui doações canceladas no resultado do filtro', async () => {
    await publicar('Arroz');

    // publica uma segunda do mesmo tipo e cancela
    const res2 = await request(app)
      .post('/api/doacoes')
      .send({ tipo: 'Arroz', quantidade: '1 kg', validade: '2026-12-01' });
    await request(app).delete(`/api/doacoes/${res2.body.id}`);

    const res = await request(app).get('/api/doacoes?tipo=Arroz');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1); // só a que não foi cancelada
  });
});
