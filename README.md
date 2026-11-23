# FinTrack — controle financeiro pessoal

Projeto 2 de Desenvolvimento Web Full Stack: API REST (Node.js/Express + PostgreSQL) e SPA (React + Vite).

## Tecnologias
- **Back-end:** Node.js 20+, Express, pg (PostgreSQL, com pool), bcrypt, jsonwebtoken, cors, dotenv, express-rate-limit
- **Front-end:** React, Vite, React Router, Axios, Recharts, Tailwind CSS v4, Material Icons (Outlined)
- **Banco:** PostgreSQL

## Estrutura
```
backend/
  database/    schema.sql, run-schema.js, seed.js
  src/
    server.js
    routes/        rotas + controladores
    models/        acesso ao banco e regras (cpf.js, faturas.js, parcelamento.js)
    middlewares/   autenticar.js (JWT), limitarLogin.js, erros.js e as validações (validarCadastro.js, validarLogin.js,
                   validarCategoria.js, validarFonteDestino.js, validarLancamento.js)
    config/        db.js (pool), jwt.js
frontend/src/
  components/  páginas e componentes (ui/ = componentes base do design system)
  contexts/    AuthContext
  services/    api.js (único cliente HTTP)
```
Utilitários puros (`cpfValido`, `calcularFatura`, `dividirEmParcelas`, `somarMeses`) ficam em `backend/src/models/`.

## Como rodar
1. Crie o banco: `createdb fintrack`
2. Back-end:
   ```bash
   cd backend
   cp .env.example .env      # ajuste DATABASE_URL e JWT_SECRET
   npm install
   npm run db:schema         # cria as tabelas
   npm run db:seed           # 2 usuários + lançamentos (senha: senha1234)
   npm run dev               # http://localhost:3000
   ```
3. Front-end:
   ```bash
   cd frontend
   cp .env.example .env
   npm install
   npm run dev               # http://localhost:5173
   ```

Usuários do seed: `ana@email.com` e `bruno@email.com` (senha `senha1234`).

### Testes do back-end
```bash
cd backend
npm test                                  # testes unitários (sem banco)

# + testes de integração (categorias, fontes-destinos e lançamentos): precisam de um banco de teste exclusivo,
# cujo schema é recriado a cada execução (o nome do banco deve conter "test")
createdb fintrack_test
TEST_DATABASE_URL=postgresql://localhost:5432/fintrack_test npm test
```

## Rotas
Implementadas até agora: `GET /api/health`, `POST /api/auth/cadastro`, `POST /api/auth/login` (limite de tentativas; ajustável por `LOGIN_RATE_LIMIT_MAX`) e `GET /api/auth/me` (requer `Authorization: Bearer <token>`), além do CRUD de `/api/categorias` e de `/api/fontes-destinos` (`GET`/`POST` e `PUT`/`DELETE` em `/:id`, todos autenticados) e de `/api/lancamentos` (`GET`/`POST`, `GET`/`PUT`/`PATCH` em `/:id` e `DELETE /:id[?todasParcelas=true]`), e os relatórios `GET /api/relatorios/categorias`, `GET /api/relatorios/faturas` e `GET /api/relatorios/fontes-destinos`.

### Lançamentos e parcelamento
- Corpo: `{ tipo, valor, descricao, data (AAAA-MM-DD), categoriaId, fonteDestinoId, parcelas? }`. A categoria e a fonte/destino precisam ser do usuário e a categoria precisa ter o mesmo tipo do lançamento. Erros vêm por campo em `{ erro, campos }` (ex.: `campos.valor`, `campos.categoriaId`), todos de uma vez.
- `parcelas` (1–48) só vale para saídas no cartão de crédito. Cada parcela é um lançamento próprio com `parcela_atual`, `total_parcelas` e o mesmo `grupo_parcelamento` (UUID), gravados numa única transação: ou todas entram, ou nenhuma.
- O valor é dividido em centavos e o resto vai para a 1ª parcela: R$ 100,00 em 3× = 33,34 + 33,33 + 33,33.
- `POST` devolve `201` com a lista das parcelas criadas (um item quando não há parcelamento). No `POST`, `valor` é o **total da compra**; no `PUT`/`PATCH` e nas respostas, é o **valor da parcela**.
- `PUT`/`PATCH` editam um lançamento com as mesmas validações; o número de parcelas não muda depois de criado. Numa compra parcelada, `tipo`, `descricao`, `categoriaId` e `fonteDestinoId` valem para todas as parcelas (a compra continua sendo uma saída no cartão), enquanto `valor` e `data` mudam só na parcela editada.
- `DELETE` remove só o lançamento ou, com `?todasParcelas=true`, todas as parcelas da compra. Ao excluir uma só parcela, as restantes são renumeradas (1/3 e 3/3 viram 1/2 e 2/2); se sobrar uma, ela vira um lançamento simples.

### Listagem de lançamentos
- `GET /api/lancamentos?inicio=AAAA-MM-DD&fim=AAAA-MM-DD&tipo=entrada|saida&categoriaId=&fonteDestinoId=&pagina=1`. Todos os filtros são opcionais e combináveis; sem `inicio`/`fim` vale o mês corrente no horário de Brasília (`America/Sao_Paulo`), independentemente do fuso do servidor. Filtro inválido (data inexistente, `fim` antes de `inicio`, tipo ou id malformado, página menor que 1) devolve `400` com `campos`.
- Resposta: `{ itens, total, pagina, totalPaginas, totais: { entradas, saidas, saldo } }`. Página fixa de 20 itens, em ordem de data decrescente. `total` é o nº de registros do filtro (a tela mostra "1–20 de 87 lançamentos") e os totais são calculados no banco com `SUM` sobre todo o período filtrado, não só a página.
- Cada item traz `categoria: { id, nome, cor }`, `fonteDestino: { id, nome, tipo }`, `parcela_atual`, `total_parcelas` e `grupo_parcelamento`.
- `GET /api/lancamentos/:id` devolve um lançamento; o de outro usuário (ou inexistente) devolve `404`.

**Decisão sobre a data das parcelas:** guardamos em cada parcela a data da compra + (k−1) meses (ajustada ao último dia do mês quando necessário, ex.: 31/01 → 28/02). Assim a lista de cada mês mostra só a parcela daquele mês (em novembro aparece apenas a 1/3), como no design. A fatura em que cada parcela cai é calculada a partir dessa data por `calcularFatura` (`models/faturas.js`).

Regras de fontes e destinos: o nome é único por usuário **e tipo** (uma conta e um cartão podem se chamar "Nubank"). Enquanto o item tiver lançamentos, o `PUT` devolve 409 se mudar o `tipo`, o `dia_fechamento` ou o `dia_vencimento`, para que as faturas (calculadas a partir da data da compra e dos dias atuais do cartão) não mudem retroativamente.

### Relatório por categoria
- `GET /api/relatorios/categorias?inicio=AAAA-MM-DD&fim=AAAA-MM-DD`. Sem `inicio`/`fim` vale o mês corrente no horário de Brasília, como na listagem; período inválido devolve `400` com `campos`.
- Resposta: `{ periodo, periodoAnterior, saidas, entradas }`. `saidas` e `entradas` trazem `total`, `totalAnterior`, `variacaoPercentual` e `categorias`, em ordem decrescente de total. Cada categoria tem `id`, `nome`, `cor`, `total`, `percentual` (sobre o total do seu tipo, 2 casas), `totalAnterior` e `variacaoPercentual` (1 casa; `0` sem variação e `null` quando não havia valor no período anterior).
- As somas são feitas no banco com `GROUP BY`/`SUM`. Categorias que só tiveram valor no período anterior aparecem com `total` 0.
- **Período anterior:** quando o filtro cobre meses inteiros, compara com a mesma quantidade de meses imediatamente antes (outubro → setembro; jan–mar → out–dez). Nos demais casos, usa a mesma quantidade de dias logo antes do `inicio` (10–19/10 → 30/09–09/10).

### Relatório por fonte/destino
- `GET /api/relatorios/fontes-destinos?inicio=AAAA-MM-DD&fim=AAAA-MM-DD`. Sem `inicio`/`fim` vale o mês corrente; período inválido devolve `400` com `campos`.
- Resposta: `{ periodo, entradas: { total, fontes }, saidas: { total, destinos }, contas, saldoContas }`.
- `fontes` e `destinos` trazem `{ id, nome, tipo, total }` em ordem decrescente de total, só com quem teve movimento no período. A separação é pelo **tipo do lançamento**, não pelo tipo da fonte/destino: uma entrada lançada num cartão (estorno) aparece em `fontes` com `tipo: "cartao_credito"`, e uma saída lançada numa renda aparece em `destinos` com `tipo: "renda"`. O relatório não filtra esses casos; o `tipo` vai na resposta para o front decidir como exibir.
- `contas` lista todas as fontes/destinos do tipo conta, em ordem alfabética, com `{ id, nome, reserva, entradas, saidas, saldo }`. `saldoContas` é a soma desses saldos. A mesma rota alimenta o "Saldo por conta" do Resumo e da lista de Fontes e destinos.
- **`saldo` é o movimento da conta no período**: entradas − saídas lançadas *naquela conta* entre `inicio` e `fim` (contas sem movimento aparecem zeradas). Não é saldo acumulado e não inclui o que foi lançado em fontes do tipo renda, porque o modelo não liga uma renda a uma conta. Por isso `saldoContas` só coincide com o saldo do mês (`totais.saldo` de `/lancamentos`) quando todas as entradas e saídas do período foram lançadas em contas. Ex.: salário de 6.800 na renda "Salário", e 550 de entrada e 1.750 de saída na Conta corrente → Conta corrente com `saldo` −1.200, enquanto o saldo do mês é positivo.
- As somas e o saldo são calculados no banco com `SUM`, numa única consulta filtrada pelo usuário.

### Faturas de cartão
`GET /api/relatorios/faturas?meses=3` devolve, para cada cartão de crédito do usuário, a fatura atual (aberta) e as `meses` seguintes, precedidas pela fatura já fechada e ainda não vencida, quando houver (padrão 3, de 0 a 24; valor inválido dá `400` em `campos.meses`):

```jsonc
{ "cartoes": [{
    "id": 1, "nome": "Visa crédito", "dia_fechamento": 25, "dia_vencimento": 5,
    "limite": 5000, "limite_utilizado": 3772, "limite_disponivel": 1228,
    "faturas": [{
      "referencia": "12/2026",            // MM/AAAA do vencimento
      "fechamento": "2026-11-25", "vencimento": "2026-12-05",
      "aberta": true,                     // só a fatura atual (a fechada e ainda a pagar vem antes, com false)
      "itens": [{ "id": 7, "descricao": "Notebook", "data": "2026-11-20", "valor": 450, "parcela_atual": 3, "total_parcelas": 10 }],
      "total": 555.34                     // fatura sem itens: "itens": [], "total": 0
    }]
}] }
```

- **O que guardamos: a data da parcela.** Nem a data da compra repetida em todas as parcelas, nem a data da fatura: cada parcela é um lançamento com a própria `data` = data da compra + (k − 1) meses (ex.: compra em 20/09 em 10× → 20/09, 20/10, 20/11…). A fatura de cada lançamento sai de `calcularFatura(data, cartao)`, tratando a data da parcela como uma compra, então a regra de fechamento (compra no dia do fechamento cai na fatura do mês seguinte) vale para todas as parcelas. A vantagem é que editar a data de uma parcela só muda a fatura dela. Limitação: se o dia da compra for 29–31 e o fechamento for depois dele, uma parcela em mês curto (fevereiro) pode cair na fatura seguinte, porque o dia 29–31 já foi ajustado ao gravar a parcela.
- **Fatura atual** é a que recebe uma compra feita hoje (`calcularFatura(hoje)`) e é a única com `aberta: true`. Entre o fechamento e o vencimento, a fatura que acabou de fechar (vencimento ≥ hoje) vem na lista antes da atual, com `aberta: false`, para a tela mostrar o valor que ainda precisa ser pago e que pesa em `limite_utilizado`; no dia seguinte ao vencimento ela sai. Por isso a lista tem `meses + 1` faturas, ou `meses + 2` nesse intervalo.
- **Limite utilizado** = soma de todas as saídas do cartão cuja fatura ainda não venceu (vencimento ≥ hoje), inclusive as de faturas além da janela exibida. **Limite disponível** = limite − limite utilizado (pode ficar negativo se o limite foi ultrapassado).
- Só saídas entram na fatura; entradas no cartão (estornos) não são abatidas. "Hoje" é a data no fuso de São Paulo.

## Design system (front-end)
- Tokens do Figma em `frontend/src/index.css`, com modo claro e escuro (`[data-theme="dark"]`). Use as classes do Tailwind (`bg-surface`, `text-text-muted`, `border-border-strong`...), sem cores soltas.
- Componentes base em `frontend/src/components/ui`: `Button`, `Badge`, `Input`, `Select`, `Segmentado` e `MoneyText`.
- Ícones: Material Icons (Outlined) com `<Icone nome="add" />`, usando o nome do ícone do Figma.
- Foco inicial em `Gaveta` e `Dialogo`: marque o campo com `data-autofocus` (não `autoFocus`). O `autoFocus` do React roda antes de o `<dialog>` abrir e o foco acaba no botão "Fechar".
- Fechamento de `Gaveta` e `Dialogo` (`useDialogoNativo`): Esc e clique fora não fecham o `<dialog>` direto; chamam `aoFechar` e quem usa o componente decide (ex.: a gaveta de lançamento pergunta "Descartar alterações?"). Se o navegador fechar mesmo assim (alguns ignoram o cancelamento no Esc repetido), o diálogo é reaberto e `aoFechar` é chamado, para o estado do React e o do DOM não se desencontrarem. Com `bloqueada`, nada fecha.
