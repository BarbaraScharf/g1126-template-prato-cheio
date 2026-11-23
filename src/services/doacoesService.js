// Regras de negócio das doações.
import * as repo from '../repositories/doacoesRepository.js';
import { STATUS } from '../status.js';

// ─── Helpers de validação ─────────────────────────────────────────────────────

/**
 * Valida que todos os campos obrigatórios estão presentes e não vazios.
 * Lança um erro listando todos os campos ausentes de uma vez.
 */
function validarCamposObrigatorios({ tipo, quantidade, validade }) {
  const faltando = ['tipo', 'quantidade', 'validade'].filter(
    campo => !({ tipo, quantidade, validade }[campo]?.toString().trim())
  );
  if (faltando.length > 0) {
    throw new Error(`Campos obrigatórios ausentes: ${faltando.join(', ')}`);
  }
}

/**
 * Valida que o tipo de alimento não contém dígitos.
 * Ex: "Arroz123" é inválido; "Arroz" e "Feijão com arroz" são válidos.
 */
function validarTipo(tipo) {
  if (/\d/.test(tipo.trim())) {
    throw new Error('O tipo de alimento não pode conter números');
  }
}

/**
 * Valida que a quantidade é um número positivo (inteiro ou decimal).
 * Aceita "15", "8.5"; rejeita "5 kg", "0", "-3".
 */
function validarQuantidade(quantidade) {
  const valor = quantidade.toString().trim();
  if (!/^\d+(\.\d+)?$/.test(valor)) {
    throw new Error('A quantidade deve ser informada apenas com números (ex: 15, 8.5)');
  }
  if (Number(valor) === 0) {
    throw new Error('A quantidade deve ser maior que zero');
  }
}

/**
 * Valida que a validade é uma data de calendário real (formato AAAA-MM-DD)
 * igual ou posterior à data de hoje.
 * Rejeita datas roladas pelo JS (ex: 2027-02-30 → 2027-03-02).
 */
function validarValidade(validade) {
  const dataValidade = new Date(validade.trim() + 'T00:00:00');
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  if (isNaN(dataValidade.getTime())) {
    throw new Error('Validade inválida: use o formato AAAA-MM-DD');
  }

  const [anoStr, mesStr, diaStr] = validade.trim().split('-');
  if (
    dataValidade.getFullYear() !== Number(anoStr) ||
    dataValidade.getMonth() + 1 !== Number(mesStr) ||
    dataValidade.getDate() !== Number(diaStr)
  ) {
    throw new Error('Validade inválida: use o formato AAAA-MM-DD');
  }

  if (dataValidade < hoje) {
    throw new Error('Validade deve ser hoje ou uma data futura');
  }
}

// ─── Helper de busca ──────────────────────────────────────────────────────────

/**
 * Busca a doação pelo id ou lança NotFoundError se não existir.
 * Elimina o padrão duplicado buscarPorId + null check que aparecia em 4 métodos.
 */
async function buscarOuLancar(id) {
  const doacao = await repo.buscarPorId(id);
  if (!doacao) throw new NotFoundError('Doação não encontrada');
  return doacao;
}

// ─── Erros tipados ────────────────────────────────────────────────────────────

/**
 * Erro de recurso não encontrado — deve virar HTTP 404.
 */
export class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
  }
}

/**
 * Violação de regra de negócio — deve virar HTTP 400.
 */
export class BusinessRuleError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BusinessRuleError';
  }
}

// ─── Casos de uso ─────────────────────────────────────────────────────────────

// História 1 — "um doador publica uma doação".
export async function criarDoacao({ tipo, quantidade, validade } = {}) {
  validarCamposObrigatorios({ tipo, quantidade, validade });
  validarTipo(tipo);
  validarQuantidade(quantidade);
  validarValidade(validade);

  return repo.inserir({
    tipo: tipo.trim(),
    quantidade: quantidade.toString().trim(),
    validade: validade.trim()
  });
}

// Histórias 2 e 5 — lista doações disponíveis, com filtro opcional por tipo.
export async function listarDisponiveis(tipo) {
  return repo.listarDisponiveisPorTipo(tipo);
}

// Lista doações aceitas ou concluídas (para a aba de Reservadas).
export async function listarAceitas() {
  return repo.listarAceitas();
}

// História 3 — "uma ONG aceita uma doação".
export async function aceitar(id, ong) {
  if (!ong?.toString().trim()) {
    throw new BusinessRuleError('Nome da ONG é obrigatório');
  }

  await buscarOuLancar(id);

  const atualizada = await repo.aceitar(id, ong.toString().trim());
  if (!atualizada) throw new BusinessRuleError('Doação não está mais disponível');
  return atualizada;
}

// História 4 — "um doador cancela uma doação disponível".
export async function cancelar(id) {
  const doacao = await buscarOuLancar(id);

  if (doacao.status === STATUS.ACEITA) {
    throw new BusinessRuleError('Não é possível cancelar uma doação já aceita por uma ONG');
  }

  const cancelada = await repo.cancelar(id);
  if (!cancelada) throw new BusinessRuleError('Doação não pode ser cancelada');
  return cancelada;
}

// Libera a reserva de volta para a lista de disponíveis.
export async function liberar(id) {
  await buscarOuLancar(id);

  const liberada = await repo.liberar(id);
  if (!liberada) throw new BusinessRuleError('Apenas doações aceitas podem ter a reserva liberada');
  return liberada;
}

// Conclui a retirada da doação pela ONG.
export async function concluir(id) {
  await buscarOuLancar(id);

  const concluida = await repo.concluir(id);
  if (!concluida) throw new BusinessRuleError('Apenas doações aceitas podem ser concluídas');
  return concluida;
}

// Exporta os helpers de validação para permitir testes unitários diretos.
export { validarTipo, validarQuantidade, validarValidade, validarCamposObrigatorios };
