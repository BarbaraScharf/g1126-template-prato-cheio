-- Cria banco de teste e garante acesso ao usuário principal
CREATE DATABASE pratocheio_teste;
\c pratocheio_teste
GRANT ALL PRIVILEGES ON DATABASE pratocheio_teste TO pratocheio;
GRANT ALL ON SCHEMA public TO pratocheio;
ALTER USER pratocheio WITH PASSWORD 'pratocheio';
