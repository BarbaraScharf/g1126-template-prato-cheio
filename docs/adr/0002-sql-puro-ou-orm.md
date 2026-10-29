SQL puro ou algum ORM?
Contexto: pouca persistência (1 tabela), equipe pequena, migração recente para o Postgres.
Alternativas:
SQL puro com pg 
Prisma
Trade-offs:
Prisma: tipagem, migrations versionadas e menos SQL escrito à mão, contra mais dependências, um passo de build a mais e uma camada que esconde o SQL.
o aceite UPDATE ... WHERE status = 'disponivel' fica explícito no SQL puro. No Prisma seria um updateMany com filtro, que funciona, mas é menos óbvio.
Decisão: manter o SQL puro, isolado no repository.
Consequências: a troca futura por um ORM fica contida no repository e não afeta services nem controllers.
Quando revisitar: quando surgirem mais entidades e relacionamentos (doador, ONG, retirada) ou quando o versionamento do schema virar problema.
