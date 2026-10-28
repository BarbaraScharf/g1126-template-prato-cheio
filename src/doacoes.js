// Regras de negócio das doações.
import * as repo from './repositorio.js';

// História 1 — "um doador publica uma doação".
// Critérios de aceite:
//   - tipo, quantidade e validade são obrigatórios (campo ausente → erro)
//   - quantidade não pode ser vazia ou só espaços
//   - validade não pode ser anterior à data de hoje
export async function criarDoacao({ tipo, quantidade, validade } = {}) {
  const faltando = ['tipo', 'quantidade', 'validade'].filter(
    campo => !({ tipo, quantidade, validade }[campo]?.toString().trim())
  );

  if (faltando.length > 0) {
    throw new Error(`Campos obrigatórios ausentes: ${faltando.join(', ')}`);
  }

  const validadeLimpa = validade.toString().trim();

  // Obtém a data de hoje no fuso horário local no formato YYYY-MM-DD
  const hoje = new Date();
  const hojeStr = [
    hoje.getFullYear(),
    String(hoje.getMonth() + 1).padStart(2, '0'),
    String(hoje.getDate()).padStart(2, '0')
  ].join('-');

  if (validadeLimpa < hojeStr) {
    throw new Error('A data de validade não pode ser anterior à data de hoje');
  }

  return repo.inserir({
    tipo: tipo.toString().trim(),
    quantidade: quantidade.toString().trim(),
    validade: validadeLimpa
  });
}

// História 2 — "uma ONG vê as doações disponíveis".
export async function listarDisponiveis(tipoFiltro) {
  return repo.listarDisponiveis(tipoFiltro?.toString().trim() || undefined);
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

// História 4 — "um doador cancela uma doação disponível".
export async function cancelar(id) {
  const doacao = await repo.buscarPorId(id);

  if (!doacao) {
    throw new Error('Doação não encontrada');
  }

  const cancelada = await repo.cancelar(id);

  if (!cancelada) {
    throw new Error('Não é possível cancelar uma doação que já foi aceita ou encerrada');
  }

  return cancelada;
}

// História 5 — "uma ONG confirma a retirada (conclui) de uma doação aceita e consulta histórico".
export async function concluir(id) {
  const doacao = await repo.buscarPorId(id);

  if (!doacao) {
    throw new Error('Doação não encontrada');
  }

  const concluida = await repo.concluir(id);

  if (!concluida) {
    throw new Error('Apenas doações aceitas podem ser marcadas como concluídas');
  }

  return concluida;
}

export async function listarAceitas(ong) {
  return repo.listarAceitas(ong?.toString().trim() || undefined);
}
// Permite que a ONG desista da reserva ou o doador reabra a doação caso ninguém vá retirar.
export async function liberarReserva(id) {
  const doacao = await repo.buscarPorId(id);

  if (!doacao) {
    throw new Error('Doação não encontrada');
  }

  const liberada = await repo.liberarReserva(id);

  if (!liberada) {
    throw new Error('Apenas doações aguardando retirada podem ser liberadas novamente');
  }

  return liberada;
}