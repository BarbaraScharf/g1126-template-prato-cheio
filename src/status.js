// Valores possíveis para o campo status da tabela doacoes.
// Centralizar aqui evita magic strings espalhadas pelo código
// e garante que um typo cause erro imediato em vez de bug silencioso.
export const STATUS = {
  DISPONIVEL: 'disponivel',
  ACEITA:     'aceita',
  CANCELADA:  'cancelada',
  CONCLUIDA:  'concluida',
};
