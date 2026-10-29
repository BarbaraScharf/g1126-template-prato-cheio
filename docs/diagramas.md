# Diagramas — Prato Cheio

*Iteração 2 · 28/10/2026*

---

## Diagrama de Contexto (C4 — Nível 1)

> Coloque aqui o diagrama de contexto mostrando o sistema Prato Cheio, os usuários (Doador e ONG) e os sistemas externos (PostgreSQL, GitHub Actions).

<!-- Exemplo de placeholder para imagem:
![Diagrama de Contexto](./imagens/diagrama-contexto.png)
-->

---

## Diagrama de Componentes (C4 — Nível 3)

> Coloque aqui o diagrama mostrando as camadas internas do sistema: Controller → Service → Repository → Database.

<!-- Exemplo:
![Diagrama de Componentes](./imagens/diagrama-componentes.png)
-->

---

## Diagrama de Fluxo — H4 (Cancelar Doação)

> Coloque aqui o fluxo de cancelamento: doador envia DELETE /api/doacoes/:id → controller → service (valida status) → repository (UPDATE condicional) → resposta.

<!-- Exemplo:
![Fluxo H4](./imagens/fluxo-h4-cancelar.png)
-->

---

## Diagrama de Fluxo — H5 (Filtrar por Tipo)

> Coloque aqui o fluxo de filtro: ONG envia GET /api/doacoes?tipo=arroz → controller → service (trim/lower) → repository (LOWER(tipo) = LOWER(?)) → lista filtrada.

<!-- Exemplo:
![Fluxo H5](./imagens/fluxo-h5-filtrar.png)
-->

---

## Diagrama de Entidade-Relacionamento

> Coloque aqui o diagrama da tabela `doacoes` com seus campos, tipos e restrições.

<!-- Exemplo:
![Diagrama ER](./imagens/diagrama-er.png)
-->

---

*Para adicionar um diagrama: salve a imagem em `docs/imagens/` e substitua o caminho no placeholder acima.*
