// Regras de negócio das doações.
import * as repo from '../repositories/doacoesRepository.js';

// História 1 — "um doador publica uma doação".
export async function criarDoacao({ tipo, quantidade, validade } = {}) {
  const faltando = ['tipo', 'quantidade', 'validade'].filter(
    campo => !({ tipo, quantidade, validade }[campo]?.toString().trim())
  );

  if (faltando.length > 0) {
    throw new Error(`Campos obrigatórios ausentes: ${faltando.join(', ')}`);
  }

  // Tipo de alimento NÃO pode conter números (ex: "Arroz123" é inválido)
  if (/\d/.test(tipo.trim())) {
    throw new Error('O tipo de alimento não pode conter números');
  }

  // Quantidade DEVE ser apenas números (inteiros ou decimais, ex: 15, 8.5)
  if (!/^\d+(\.\d+)?$/.test(quantidade.toString().trim())) {
    throw new Error('A quantidade deve ser informada apenas com números (ex: 15, 8.5)');
  }

  // Validade não pode ser hoje nem no passado
  const dataValidade = new Date(validade.trim() + 'T00:00:00');
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  if (isNaN(dataValidade.getTime())) {
    throw new Error('Validade inválida: use o formato AAAA-MM-DD');
  }
  // Verifica se a data não foi "arredondada" pelo JS (ex: 30/02 vira 02/03)
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

  return repo.inserir({
    tipo: tipo.trim(),
    quantidade: quantidade.toString().trim(),
    validade: validade.trim()
  });
}

// Histórias 2 e 5 — "uma ONG vê as doações disponíveis" / "filtra por tipo".
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
    throw new Error('Nome da ONG é obrigatório');
  }

  const doacao = await repo.buscarPorId(id);

  if (!doacao) {
    throw new Error('Doação não encontrada');
  }

  const atualizada = await repo.aceitar(id, ong.toString().trim());

  if (!atualizada) {
    throw new Error('Doação não está mais disponível');
  }

  return atualizada;
}

// História 4 — "um doador cancela uma doação disponível".
export async function cancelar(id) {
  const doacao = await repo.buscarPorId(id);

  if (!doacao) {
    throw new Error('Doação não encontrada');
  }

  if (doacao.status === 'aceita') {
    throw new Error('Não é possível cancelar uma doação já aceita por uma ONG');
  }

  const cancelada = await repo.cancelar(id);

  if (!cancelada) {
    throw new Error('Doação não pode ser cancelada');
  }

  return cancelada;
}

// Libera a reserva de volta para a lista de disponíveis
export async function liberar(id) {
  const doacao = await repo.buscarPorId(id);

  if (!doacao) {
    throw new Error('Doação não encontrada');
  }

  const liberada = await repo.liberar(id);

  if (!liberada) {
    throw new Error('Apenas doações aceitas podem ter a reserva liberada');
  }

  return liberada;
}

// Conclui a retirada da doação pela ONG
export async function concluir(id) {
  const doacao = await repo.buscarPorId(id);

  if (!doacao) {
    throw new Error('Doação não encontrada');
  }

  const concluida = await repo.concluir(id);

  if (!concluida) {
    throw new Error('Apenas doações aceitas podem ser concluídas');
  }

  return concluida;
}