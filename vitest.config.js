export default {
  test: {
    env: {
      DATABASE_FILE: ':memory:'
    },
    // pg é carregado dinamicamente apenas em produção (PostgreSQL).
    // Externalizar impede que o Vitest tente resolver/bundlar o pg nos testes.
    server: {
      deps: {
        external: ['pg']
      }
    }
  }
};
