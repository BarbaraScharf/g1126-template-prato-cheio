// Regras de negócio das doações.
import * as repo from '../repositories/doacoesRepository.js';

// História 1 — "um doador publica uma doação".
// Critérios de aceite:
//   - tipo, quantidade e validade são obrigatórios (campo ausente → erro)
//   - quantidade não pode ser vazia ou só espaços
export async function criarDoacao({ tipo, quantidade, validade } = {}) {
  const faltando = ['tipo', 'quantidade', 'validade'].filter(
    campo => !({ tipo, quantidade, validade }[campo]?.toString().trim())
  );

  if (faltando.length > 0) {
    throw new Error(`Campos obrigatórios ausentes: ${faltando.join(', ')}`);
  }

  return repo.inserir({
    tipo: tipo.trim(),
    quantidade: quantidade.trim(),
    validade: validade.trim()
  });
}

// História 2 — "uma ONG vê as doações disponíveis".
export async function listarDisponiveis() {
  return repo.listarDisponiveis();
}

// História 3 — "uma ONG aceita uma doação".
// Critérios:
//   - nome da ONG é obrigatório
//   - doação já aceita por outra ONG → erro informativo
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
