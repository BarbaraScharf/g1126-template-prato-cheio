import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { criarApp } from '../src/app.js';
import { migrar, limparBanco, encerrar } from '../src/database/db.js';

const app = criarApp();

// Helper: data AAAA-MM-DD de hoje + N dias, em horário local
function hojeMais(dias) {
  const data = new Date();
  data.setDate(data.getDate() + dias);
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
}

describe('a aplicação sobe', () => {
  it('responde na verificação de saúde', async () => {
    const res = await request(app).get('/api/saude');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe('publicar e listar doações', () => {
  beforeEach(async () => {
    await migrar();
    await limparBanco();
  });

  afterAll(async () => {
    await encerrar();
  });

  it('mostra a doação publicada na lista de disponíveis', async () => {
    await request(app)
      .post('/api/doacoes')
      .send({ tipo: 'Sopa', quantidade: '10', validade: hojeMais(30) })
      .expect(201);

    const res = await request(app).get('/api/doacoes');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].tipo).toBe('Sopa');
    expect(res.body[0].status).toBe('disponivel');
  });

  it('recusa doação sem os campos obrigatórios', async () => {
    const res = await request(app)
      .post('/api/doacoes')
      .send({ tipo: 'Arroz' });
    expect(res.status).toBe(400);
    expect(res.body.erro).toMatch(/quantidade/);
    expect(res.body.erro).toMatch(/validade/);
  });

  it('recusa doação com números no tipo de alimento', async () => {
    const res = await request(app)
      .post('/api/doacoes')
      .send({ tipo: 'Arroz123', quantidade: '5', validade: hojeMais(30) });
    expect(res.status).toBe(400);
    expect(res.body.erro).toMatch(/não pode conter números/);
  });

  it('recusa doação com quantidade não numérica', async () => {
    const res = await request(app)
      .post('/api/doacoes')
      .send({ tipo: 'Arroz', quantidade: '5 kg', validade: hojeMais(30) });
    expect(res.status).toBe(400);
    expect(res.body.erro).toMatch(/apenas com números/);
  });

  it('recusa doação com validade no passado', async () => {
    const res = await request(app)
      .post('/api/doacoes')
      .send({ tipo: 'Sopa', quantidade: '5', validade: '2020-01-01' });
    expect(res.status).toBe(400);
    expect(res.body.erro).toMatch(/data futura/);
  });

  it('recusa doação com validade inexistente no calendário', async () => {
    const res = await request(app)
      .post('/api/doacoes')
      .send({ tipo: 'Sopa', quantidade: '5', validade: '2027-02-30' });
    expect(res.status).toBe(400);
    expect(res.body.erro).toMatch(/Validade inválida/);
  });

  it('aceita doação com validade igual à data de hoje', async () => {
    const res = await request(app)
      .post('/api/doacoes')
      .send({ tipo: 'Sopa', quantidade: '5', validade: hojeMais(0) });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('disponivel');
  });

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

  async function publicarDoacao(tipo = 'Feijão') {
    const res = await request(app)
      .post('/api/doacoes')
      .send({ tipo, quantidade: '5', validade: hojeMais(30) });
    return res.body.id;
  }

  it('marca a doação como aceita pela ONG', async () => {
    const id = await publicarDoacao();
    const res = await request(app)
      .post(`/api/doacoes/${id}/aceitar`)
      .send({ ong: 'ONG Esperança' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('aceita');
    expect(res.body.ong).toBe('ONG Esperança');
  });

  it('remove a doação da lista de disponíveis depois de aceita', async () => {
    const id = await publicarDoacao();
    await request(app).post(`/api/doacoes/${id}/aceitar`).send({ ong: 'ONG Esperança' });
    const res = await request(app).get('/api/doacoes');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  it('recusa aceitar uma doação que já foi aceita por outra ONG', async () => {
    const id = await publicarDoacao();
    await request(app).post(`/api/doacoes/${id}/aceitar`).send({ ong: 'ONG Esperança' });
    const res = await request(app)
      .post(`/api/doacoes/${id}/aceitar`)
      .send({ ong: 'ONG Solidária' });
    expect(res.status).toBe(400);
    expect(res.body.erro).toMatch(/não está mais disponível/);
  });

  it('recusa aceitar uma doação sem informar o nome da ONG', async () => {
    const id = await publicarDoacao();
    const res = await request(app)
      .post(`/api/doacoes/${id}/aceitar`)
      .send({ ong: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.erro).toBe('Nome da ONG é obrigatório');
  });

  it('recusa aceitar quando o id não é numérico', async () => {
    const res = await request(app)
      .post('/api/doacoes/abc/aceitar')
      .send({ ong: 'ONG Esperança' });
    expect(res.status).toBe(400);
    expect(res.body.erro).toBe('Doação não encontrada');
  });

  it('recusa aceitar uma doação inexistente', async () => {
    const res = await request(app)
      .post('/api/doacoes/99999/aceitar')
      .send({ ong: 'ONG Esperança' });
    expect(res.status).toBe(400);
    expect(res.body.erro).toBe('Doação não encontrada');
  });

  it('recusa aceitar uma doação cancelada', async () => {
    const id = await publicarDoacao();
    await request(app).post(`/api/doacoes/${id}/cancelar`);
    const res = await request(app)
      .post(`/api/doacoes/${id}/aceitar`)
      .send({ ong: 'ONG Esperança' });
    expect(res.status).toBe(400);
    expect(res.body.erro).toMatch(/não está mais disponível/);
  });
});

describe('cancelar uma doação', () => {
  beforeEach(async () => {
    await migrar();
    await limparBanco();
  });

  afterAll(async () => {
    await encerrar();
  });

  async function publicarDoacao(tipo = 'Arroz') {
    const res = await request(app)
      .post('/api/doacoes')
      .send({ tipo, quantidade: '3', validade: hojeMais(30) });
    return res.body.id;
  }

  it('muda o status para cancelada quando a doação está disponível', async () => {
    const id = await publicarDoacao();
    const res = await request(app).post(`/api/doacoes/${id}/cancelar`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelada');
    expect(res.body.id).toBe(id);
  });

  it('remove a doação da lista de disponíveis depois de cancelada', async () => {
    const id = await publicarDoacao();
    await request(app).post(`/api/doacoes/${id}/cancelar`);
    const res = await request(app).get('/api/doacoes');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  it('recusa cancelar uma doação que já foi aceita por uma ONG', async () => {
    const id = await publicarDoacao();
    await request(app).post(`/api/doacoes/${id}/aceitar`).send({ ong: 'ONG Esperança' });
    const res = await request(app).post(`/api/doacoes/${id}/cancelar`);
    expect(res.status).toBe(400);
    expect(res.body.erro).toMatch(/já aceita por uma ONG/);
  });

  it('retorna erro ao tentar cancelar uma doação inexistente', async () => {
    const res = await request(app).post('/api/doacoes/9999/cancelar');
    expect(res.status).toBe(400);
    expect(res.body.erro).toMatch(/não encontrada/);
  });

  it('retorna erro ao tentar cancelar com id não numérico', async () => {
    const res = await request(app).post('/api/doacoes/abc/cancelar');
    expect(res.status).toBe(400);
    expect(res.body.erro).toBe('Doação não encontrada');
  });

  it('recusa cancelar duas vezes a mesma doação', async () => {
    const id = await publicarDoacao();
    await request(app).post(`/api/doacoes/${id}/cancelar`).expect(200);
    const res = await request(app).post(`/api/doacoes/${id}/cancelar`);
    expect(res.status).toBe(400);
    expect(res.body.erro).toMatch(/não pode ser cancelada/);
  });
});

describe('filtrar doações por tipo', () => {
  beforeEach(async () => {
    await migrar();
    await limparBanco();
  });

  afterAll(async () => {
    await encerrar();
  });

  async function publicar(tipo, quantidade = '2') {
    await request(app)
      .post('/api/doacoes')
      .send({ tipo, quantidade, validade: hojeMais(30) });
  }

  it('retorna apenas as doações do tipo solicitado', async () => {
    await publicar('Arroz');
    await publicar('Feijão');
    await publicar('Arroz');
    const res = await request(app).get('/api/doacoes?tipo=Arroz');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body.every(d => d.tipo === 'Arroz')).toBe(true);
  });

  it('encontra doações independentemente de maiúsculas ou minúsculas', async () => {
    await publicar('Arroz');
    const res = await request(app).get('/api/doacoes?tipo=arroz');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].tipo).toBe('Arroz');
  });

  it('retorna lista vazia quando nenhuma doação bate com o tipo', async () => {
    await publicar('Arroz');
    const res = await request(app).get('/api/doacoes?tipo=Macarrão');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  it('retorna todas as disponíveis quando nenhum filtro é aplicado', async () => {
    await publicar('Arroz');
    await publicar('Feijão');
    await publicar('Sopa');
    const res = await request(app).get('/api/doacoes');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
  });

  it('não inclui doações canceladas no resultado do filtro', async () => {
    await publicar('Arroz');
    const res2 = await request(app)
      .post('/api/doacoes')
      .send({ tipo: 'Arroz', quantidade: '1', validade: hojeMais(30) });
    await request(app).post(`/api/doacoes/${res2.body.id}/cancelar`);
    const res = await request(app).get('/api/doacoes?tipo=Arroz');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});

describe('concluir a retirada de uma doação — H6', () => {
  beforeEach(async () => {
    await migrar();
    await limparBanco();
  });

  afterAll(async () => {
    await encerrar();
  });

  async function publicarEAceitar(tipo = 'Pão') {
    const criada = await request(app)
      .post('/api/doacoes')
      .send({ tipo, quantidade: '2', validade: hojeMais(30) });
    const id = criada.body.id;
    await request(app).post(`/api/doacoes/${id}/aceitar`).send({ ong: 'ONG Esperança' });
    return id;
  }

  it('muda o status para concluida quando a doação está aceita', async () => {
    const id = await publicarEAceitar();
    const res = await request(app).post(`/api/doacoes/${id}/concluir`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('concluida');
    expect(res.body.id).toBe(id);
  });

  it('remove a doação concluída da lista de disponíveis', async () => {
    const id = await publicarEAceitar();
    await request(app).post(`/api/doacoes/${id}/concluir`);
    const res = await request(app).get('/api/doacoes');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  it('aparece na lista de aceitas/concluídas após concluir', async () => {
    const id = await publicarEAceitar();
    await request(app).post(`/api/doacoes/${id}/concluir`);
    const res = await request(app).get('/api/doacoes/aceitas');
    expect(res.status).toBe(200);
    expect(res.body.some(d => d.id === id && d.status === 'concluida')).toBe(true);
  });

  it('recusa concluir uma doação que ainda está disponível', async () => {
    const criada = await request(app)
      .post('/api/doacoes')
      .send({ tipo: 'Maçã', quantidade: '10', validade: hojeMais(30) });
    const res = await request(app).post(`/api/doacoes/${criada.body.id}/concluir`);
    expect(res.status).toBe(400);
    expect(res.body.erro).toMatch(/apenas doações aceitas/i);
  });

  it('recusa concluir uma doação cancelada', async () => {
    const criada = await request(app)
      .post('/api/doacoes')
      .send({ tipo: 'Leite', quantidade: '3', validade: hojeMais(30) });
    const id = criada.body.id;
    await request(app).post(`/api/doacoes/${id}/cancelar`);
    const res = await request(app).post(`/api/doacoes/${id}/concluir`);
    expect(res.status).toBe(400);
    expect(res.body.erro).toMatch(/apenas doações aceitas/i);
  });

  it('recusa concluir uma doação inexistente', async () => {
    const res = await request(app).post('/api/doacoes/99999/concluir');
    expect(res.status).toBe(400);
    expect(res.body.erro).toBe('Doação não encontrada');
  });
});

describe('liberar reserva de uma doação', () => {
  beforeEach(async () => {
    await migrar();
    await limparBanco();
  });

  afterAll(async () => {
    await encerrar();
  });

  async function publicarEAceitar(tipo = 'Frango') {
    const criada = await request(app)
      .post('/api/doacoes')
      .send({ tipo, quantidade: '1', validade: hojeMais(30) });
    const id = criada.body.id;
    await request(app).post(`/api/doacoes/${id}/aceitar`).send({ ong: 'ONG Teste' });
    return id;
  }

  it('volta o status para disponivel ao liberar a reserva', async () => {
    const id = await publicarEAceitar();
    const res = await request(app).post(`/api/doacoes/${id}/liberar`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('disponivel');
    expect(res.body.ong).toBeNull();
  });

  it('reaparece na lista de disponíveis após liberar', async () => {
    const id = await publicarEAceitar();
    await request(app).post(`/api/doacoes/${id}/liberar`);
    const res = await request(app).get('/api/doacoes');
    expect(res.status).toBe(200);
    expect(res.body.some(d => d.id === id)).toBe(true);
  });

  it('recusa liberar uma doação que ainda está disponível', async () => {
    const criada = await request(app)
      .post('/api/doacoes')
      .send({ tipo: 'Tomate', quantidade: '5', validade: hojeMais(30) });
    const res = await request(app).post(`/api/doacoes/${criada.body.id}/liberar`);
    expect(res.status).toBe(400);
    expect(res.body.erro).toMatch(/apenas doações aceitas/i);
  });

  it('recusa liberar uma doação inexistente', async () => {
    const res = await request(app).post('/api/doacoes/99999/liberar');
    expect(res.status).toBe(400);
    expect(res.body.erro).toBe('Doação não encontrada');
  });
});

describe('listar doações aceitas e concluídas', () => {
  beforeEach(async () => {
    await migrar();
    await limparBanco();
  });

  afterAll(async () => {
    await encerrar();
  });

  it('retorna lista vazia quando não há doações aceitas', async () => {
    const res = await request(app).get('/api/doacoes/aceitas');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  it('inclui doações aceitas e concluídas, mas não disponíveis nem canceladas', async () => {
    // disponível
    await request(app).post('/api/doacoes').send({ tipo: 'Arroz', quantidade: '1', validade: hojeMais(30) });

    // aceita
    const aceita = await request(app).post('/api/doacoes').send({ tipo: 'Feijão', quantidade: '2', validade: hojeMais(30) });
    await request(app).post(`/api/doacoes/${aceita.body.id}/aceitar`).send({ ong: 'ONG A' });

    // cancelada
    const cancelada = await request(app).post('/api/doacoes').send({ tipo: 'Sopa', quantidade: '3', validade: hojeMais(30) });
    await request(app).post(`/api/doacoes/${cancelada.body.id}/cancelar`);

    // concluída
    const concluida = await request(app).post('/api/doacoes').send({ tipo: 'Pão', quantidade: '4', validade: hojeMais(30) });
    await request(app).post(`/api/doacoes/${concluida.body.id}/aceitar`).send({ ong: 'ONG B' });
    await request(app).post(`/api/doacoes/${concluida.body.id}/concluir`);

    const res = await request(app).get('/api/doacoes/aceitas');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body.every(d => ['aceita', 'concluida'].includes(d.status))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Casos limite — comportamentos de borda não cobertos pelos critérios originais
// ---------------------------------------------------------------------------

describe('casos limite na publicação de doações', () => {
  beforeEach(async () => {
    await migrar();
    await limparBanco();
  });

  afterAll(async () => {
    await encerrar();
  });

  // Caso limite 1: quantidade zero não é uma doação válida.
  // A regex /^\d+(\.\d+)?$/ aceita '0', mas zero unidades não faz sentido
  // logístico — a regra deve rejeitar explicitamente.
  it('recusa doação com quantidade zero', async () => {
    const res = await request(app)
      .post('/api/doacoes')
      .send({ tipo: 'Arroz', quantidade: '0', validade: hojeMais(30) });
    expect(res.status).toBe(400);
    expect(res.body.erro).toMatch(/maior que zero/);
  });

  // Caso limite 2: tipo com número misturado a letras (ex: "Arroz2")
  // já é coberto pelo teste existente. Este cobre o limite oposto:
  // tipo com apenas letras e espaços (ex: "Pães e Padaria") deve ser aceito.
  it('aceita tipo de alimento com espaços e acentos', async () => {
    const res = await request(app)
      .post('/api/doacoes')
      .send({ tipo: 'Pães e Padaria', quantidade: '5', validade: hojeMais(30) });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('disponivel');
  });
});
