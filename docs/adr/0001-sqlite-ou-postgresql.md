SQLite ou PostgreSQL?
Contexto: o walking skeleton usou SQLite  para validar a ideia rápido. Mas o SQLite trava o banco inteiro em cada escrita. Além disso, ele é um arquivo local, não serve para produção, e a disciplina exige PostgreSQL.
Alternativas: 
Manter o SQLite 
PostgreSQL
      - Como subir o Postgres: 
- instalar na máquina
- serviço gerenciado
- Docker
     - Trade-offs:
- PostgreSQL: concorrência por linha, pronto para produção e padrão de mercado.
- SQLite: zero infraestrutura e testes em memória muito rápidos, contra concorrência limitada e não servir para produção.
- Docker: mesmo banco e mesma versão para todos e a mesma imagem no CI, contra exigir o Docker instalado. Instalar na máquina gera versões diferentes entre os integrantes, o serviço gerenciado depende de internet e de conta externa.
     - Decisão: 
- PostgreSQL 16 em Docker, com o driver pg. A troca ficou contida em  src/database/db.js, que manteve a mesma interface, então repository, services e controllers não mudaram.
- Consequências: os mesmos 8 testes passaram antes e depois da migração, sem  alterar nenhum teste. O aceite com UPDATE ... WHERE status = 'disponivel' continua garantindo que duas ONGs não aceitem a mesma doação. Em troca, rodar o sistema e os testes agora exige Docker ligado. Os testes usam um banco separado (pratocheio_teste) para não apagar os dados de desenvolvimento.
- Quando revisitar: se o Docker virar problema para algum integrante ou na hora de publicar o sistema. Basta apontar DATABASE_URL para um Postgres local ou gerenciado, sem mudar o código.
