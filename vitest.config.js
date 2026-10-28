export default {
  test: {
    env: {
      DATABASE_URL: process.env.DATABASE_URL || 'postgres://pratocheio:pratocheio@localhost:5432/pratocheio_teste'
    }
  }
};
