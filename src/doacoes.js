// Regras de negócio das doações.
import * as repo from './repositorio.js';

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

  // Tipo de alimento não pode conter números — "Arroz123" não é um tipo válido
  if (/\d/.test(tipo.trim())) {
    throw new Error('Tipo de alimento não pode conter números');
  }

  // Validade não pode ser hoje nem no passado — o alimento já estaria vencido
  // ou vencendo no mesmo dia da publicação, o que não faz sentido logístico.
  const dataValidade = new Date(validade.trim() + 'T00:00:00');
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  if (isNaN(dataValidade.getTime())) {
    throw new Error('Validade inválida: use o formato AAAA-MM-DD');
  }
  if (dataValidade < hoje) {
    throw new Error('Validade deve ser hoje ou uma data futura');
  }

  return repo.inserir({
    tipo: tipo.trim(),
    quantidade: quantidade.trim(),
    validade: validade.trim()
  });
}

// Histórias 2 e 5 — "uma ONG vê as doações disponíveis" / "filtra por tipo".
// Critérios H5:
//   - sem parâmetro → retorna todas as disponíveis (comportamento original de H2)
//   - com tipo → retorna só as que batem, insensível a maiúsculas
//   - tipo sem correspondência → retorna []
export async function listarDisponiveis(tipo) {
  return repo.listarDisponiveisPorTipo(tipo);
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
// Critérios:
//   - doação inexistente → erro
//   - doação já aceita por ONG → não pode ser cancelada, erro informativo
//   - doação disponível → status muda para 'cancelada' e some da lista
export async function cancelar(id) {
  const doacao = await repo.buscarPorId(id);

  if (!doacao) {
    throw new Error('Doação não encontrada');
  }

  if (doacao.status === 'aceita') {
    throw new Error('Não é possível cancelar uma doação já aceita por uma ONG');
  }

  // UPDATE condicional no repositório (WHERE status = 'disponivel') garante
  // atomicidade, mas o erro descritivo já foi dado acima.
  const cancelada = await repo.cancelar(id);

  if (!cancelada) {
    throw new Error('Doação não pode ser cancelada');
  }

  return cancelada;
}
