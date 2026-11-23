/**
 * Testes unitários focados nas quatro refatorações aplicadas ao Prato Cheio.
 *
 * Refatoração 1 — helpers de validação extraídos de criarDoacao
 * Refatoração 2 — erros tipados (NotFoundError / BusinessRuleError)
 * Refatoração 3 — UPDATE … RETURNING * no repositório (sem SELECT separado)
 * Refatoração 4 — parsearId no controller (id validado antes de chegar ao service)
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { criarApp } from '../src/app.js';
import { migrar, limparBanco, encerrar } from '../src/database/db.js';
import {
  validarTipo,
  validarQuantidade,
  validarValidade,
  validarCamposObrigatorios,
  NotFoundError,
  BusinessRuleError,
  aceitar,
  cancelar,
  liberar,
  concluir,
  criarDoacao,
} from '../src/services/doacoesService.js';

const app = criarApp();

// Helper: data AAAA-MM-DD de hoje + N dias, em horário local
function hojeMais(dias) {
  const data = new Date();
  data.setDate(data.getDate() + dias);
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Refatoração 1 — Helpers de validação extraídos de criarDoacao
// ─────────────────────────────────────────────────────────────────────────────

describe('Refatoração 1 — validarCamposObrigatorios', () => {
  it('lança erro listando todos os campos ausentes de uma vez', () => {
    expect(() => validarCamposObrigatorios({ tipo: '', quantidade: '', validade: '' }))
      .toThrow(/tipo.*quantidade.*validade|quantidade.*validade.*tipo/i);
  });

  it('lança erro quando apenas quantidade e validade estão ausentes', () => {
    expect(() => validarCamposObrigatorios({ tipo: 'Arroz', quantidade: '', validade: '' }))
      .toThrow(/quantidade/);
  });

  it('não lança erro quando todos os campos estão presentes', () => {
    expect(() =>
      validarCamposObrigatorios({ tipo: 'Arroz', quantidade: '5', validade: hojeMais(1) })
    ).not.toThrow();
  });
});

describe('Refatoração 1 — validarTipo', () => {
  it('lança erro quando o tipo contém dígitos', () => {
    expect(() => validarTipo('Arroz123')).toThrow(/não pode conter números/);
  });

  it('lança erro quando o tipo é só números', () => {
    expect(() => validarTipo('123')).toThrow(/não pode conter números/);
  });

  it('aceita tipo com apenas letras', () => {
    expect(() => validarTipo('Feijão')).not.toThrow();
  });

  it('aceita tipo com espaços e acentos', () => {
    expect(() => validarTipo('Caldo de frango')).not.toThrow();
  });
});

describe('Refatoração 1 — validarQuantidade', () => {
  it('lança erro para quantidade com texto', () => {
    expect(() => validarQuantidade('5 kg')).toThrow(/apenas com números/);
  });

  it('lança erro para quantidade zero', () => {
    expect(() => validarQuantidade('0')).toThrow(/maior que zero/);
  });

  it('lança erro para quantidade negativa escrita como texto', () => {
    expect(() => validarQuantidade('-3')).toThrow(/apenas com números/);
  });

  it('aceita inteiro positivo', () => {
    expect(() => validarQuantidade('10')).not.toThrow();
  });

  it('aceita decimal positivo', () => {
    expect(() => validarQuantidade('8.5')).not.toThrow();
  });
});

describe('Refatoração 1 — validarValidade', () => {
  it('lança erro para validade no passado', () => {
    expect(() => validarValidade('2020-01-01')).toThrow(/data futura/);
  });

  it('lança erro para data inexistente no calendário (02-30)', () => {
    expect(() => validarValidade('2027-02-30')).toThrow(/Validade inválida/);
  });

  it('lança erro para formato inválido', () => {
    expect(() => validarValidade('não-é-data')).toThrow(/Validade inválida/);
  });

  it('aceita a data de hoje', () => {
    expect(() => validarValidade(hojeMais(0))).not.toThrow();
  });

  it('aceita data futura', () => {
    expect(() => validarValidade(hojeMais(30))).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Refatoração 2 — Erros tipados e status HTTP correto (404 vs 400)
// ─────────────────────────────────────────────────────────────────────────────

describe('Refatoração 2 — NotFoundError e BusinessRuleError são classes distintas', () => {
  it('NotFoundError é instância de Error', () => {
    const e = new NotFoundError('não achei');
    expect(e).toBeInstanceOf(Error);
    expect(e).toBeInstanceOf(NotFoundError);
    expect(e.name).toBe('NotFoundError');
    expect(e.message).toBe('não achei');
  });

  it('BusinessRuleError é instância de Error', () => {
    const e = new BusinessRuleError('regra violada');
    expect(e).toBeInstanceOf(Error);
    expect(e).toBeInstanceOf(BusinessRuleError);
    expect(e.name).toBe('BusinessRuleError');
    expect(e.message).toBe('regra violada');
  });

  it('NotFoundError não é BusinessRuleError', () => {
    expect(new NotFoundError('x')).not.toBeInstanceOf(BusinessRuleError);
  });
});

describe('Refatoração 2 — controller retorna 404 para doação inexistente', () => {
  beforeEach(async () => { await migrar(); await limparBanco(); });
  afterAll(async () => { await encerrar(); });

  it('aceitar doação inexistente retorna 404', async () => {
    const res = await request(app)
      .post('/api/doacoes/99999/aceitar')
      .send({ ong: 'ONG Teste' });
    expect(res.status).toBe(404);
    expect(res.body.erro).toBe('Doação não encontrada');
  });

  it('cancelar doação inexistente retorna 404', async () => {
    const res = await request(app).post('/api/doacoes/99999/cancelar');
    expect(res.status).toBe(404);
    expect(res.body.erro).toBe('Doação não encontrada');
  });

  it('liberar doação inexistente retorna 404', async () => {
    const res = await request(app).post('/api/doacoes/99999/liberar');
    expect(res.status).toBe(404);
    expect(res.body.erro).toBe('Doação não encontrada');
  });

  it('concluir doação inexistente retorna 404', async () => {
    const res = await request(app).post('/api/doacoes/99999/concluir');
    expect(res.status).toBe(404);
    expect(res.body.erro).toBe('Doação não encontrada');
  });

  it('violação de regra de negócio (aceitar doação já aceita) ainda retorna 400', async () => {
    const criada = await request(app)
      .post('/api/doacoes')
      .send({ tipo: 'Arroz', quantidade: '5', validade: hojeMais(30) });
    const id = criada.body.id;
    await request(app).post(`/api/doacoes/${id}/aceitar`).send({ ong: 'ONG A' });
    const res = await request(app)
      .post(`/api/doacoes/${id}/aceitar`)
      .send({ ong: 'ONG B' });
    expect(res.status).toBe(400);
    expect(res.body.erro).toMatch(/não está mais disponível/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Refatoração 3 — UPDATE … RETURNING * (sem SELECT separado no repositório)
// ─────────────────────────────────────────────────────────────────────────────

describe('Refatoração 3 — operações do repositório retornam a linha atualizada corretamente', () => {
  beforeEach(async () => { await migrar(); await limparBanco(); });
  afterAll(async () => { await encerrar(); });

  async function publicar(tipo = 'Arroz') {
    const res = await request(app)
      .post('/api/doacoes')
      .send({ tipo, quantidade: '5', validade: hojeMais(30) });
    return res.body;
  }

  it('aceitar retorna a linha com status aceita e o nome da ONG', async () => {
    const doacao = await publicar();
    const res = await request(app)
      .post(`/api/doacoes/${doacao.id}/aceitar`)
      .send({ ong: 'ONG Feliz' });
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(doacao.id);
    expect(res.body.status).toBe('aceita');
    expect(res.body.ong).toBe('ONG Feliz');
  });

  it('cancelar retorna a linha com status cancelada', async () => {
    const doacao = await publicar('Feijão');
    const res = await request(app).post(`/api/doacoes/${doacao.id}/cancelar`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(doacao.id);
    expect(res.body.status).toBe('cancelada');
  });

  it('liberar retorna a linha com status disponivel e ong nula', async () => {
    const doacao = await publicar('Sopa');
    await request(app).post(`/api/doacoes/${doacao.id}/aceitar`).send({ ong: 'ONG X' });
    const res = await request(app).post(`/api/doacoes/${doacao.id}/liberar`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('disponivel');
    expect(res.body.ong).toBeNull();
  });

  it('concluir retorna a linha com status concluida', async () => {
    const doacao = await publicar('Pão');
    await request(app).post(`/api/doacoes/${doacao.id}/aceitar`).send({ ong: 'ONG Y' });
    const res = await request(app).post(`/api/doacoes/${doacao.id}/concluir`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('concluida');
    expect(res.body.id).toBe(doacao.id);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Refatoração 4 — parsearId no controller (Primitive Obsession)
// ─────────────────────────────────────────────────────────────────────────────

describe('Refatoração 4 — id não numérico retorna 404 no controller', () => {
  beforeEach(async () => { await migrar(); await limparBanco(); });
  afterAll(async () => { await encerrar(); });

  const rotas = [
    ['post', '/api/doacoes/abc/aceitar',   { ong: 'ONG Teste' }],
    ['post', '/api/doacoes/abc/cancelar',  {}],
    ['post', '/api/doacoes/abc/liberar',   {}],
    ['post', '/api/doacoes/abc/concluir',  {}],
  ];

  for (const [method, rota, body] of rotas) {
    it(`${method.toUpperCase()} ${rota} → 404 para id "abc"`, async () => {
      const res = await request(app)[method](rota).send(body);
      expect(res.status).toBe(404);
      expect(res.body.erro).toBe('Doação não encontrada');
    });
  }

  it('id zero retorna 404', async () => {
    const res = await request(app).post('/api/doacoes/0/aceitar').send({ ong: 'ONG' });
    expect(res.status).toBe(404);
  });

  it('id negativo retorna 404', async () => {
    const res = await request(app).post('/api/doacoes/-5/cancelar');
    expect(res.status).toBe(404);
  });

  it('id decimal retorna 404', async () => {
    const res = await request(app).post('/api/doacoes/1.5/concluir');
    expect(res.status).toBe(404);
  });

  it('id inteiro positivo válido passa pelo controller e chega ao service', async () => {
    // Sem doação criada, deve retornar 404 do service (não encontrada), não do controller
    const res = await request(app).post('/api/doacoes/1/cancelar');
    expect(res.status).toBe(404);
    expect(res.body.erro).toBe('Doação não encontrada');
  });
});
