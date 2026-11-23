# FinTrack — controle financeiro pessoal

Projeto 2 de Desenvolvimento Web Full Stack: API REST (Node.js/Express + PostgreSQL) e SPA (React + Vite).

Design (Figma): [FinTrack](https://www.figma.com/design/kiJuYs1GQALZBR62vMNZVw/Untitled). As telas são só para desktop, a partir de 1440 px.

## Tecnologias
- **Back-end:** Node.js, Express 5, pg (PostgreSQL, com pool), bcrypt, jsonwebtoken, cors, dotenv e express-rate-limit. Testes com `node:test`.
- **Front-end:** React 19, Vite 8, React Router 7, Axios, Recharts 3, Tailwind CSS 4 e Material Icons (Outlined). Lint com oxlint.
- **Banco:** PostgreSQL (testado na versão 16).

## Estrutura
```
backend/
  database/      schema.sql, run-schema.js, seed.js, demonstracao.js (dados do seed)
  src/
    server.js      sobe a API (lê e valida o .env)
    app.js         monta o Express (CORS, cabeçalhos de segurança, rotas e erros)
    routes/        rotas e controladores
    models/        acesso ao banco e regras (faturas, parcelamento, relatórios, saúde financeira)
    middlewares/   autenticação (JWT), limites de tentativas, validações e tratamento de erros
    config/        ambiente.js, db.js (pool), jwt.js, senha.js
    services/      iaDicas.js (dicas opcionais por IA)
    utils/         datas, ids e textos
  test/          testes unitários e de integração
frontend/src/
  components/    páginas e componentes (ui/ = componentes base do design system)
  contexts/      AuthContext
  hooks/         useApi
  services/      api.js (único cliente HTTP)
  utils/         formatadores e cálculos de exibição
docs/
  roteiro-seguranca.http   roteiro de requisições para a apresentação
```
As funções puras de regra (`cpfValido`, `calcularFatura`, `dividirEmParcelas`, `somarMeses`) ficam em `backend/src/models/`.

## Como rodar
**Pré-requisitos:** Node.js 20.19+ (ou 22.12+, exigido pelo Vite) e PostgreSQL. Os comandos abaixo partem da raiz do repositório.

1. **Banco de dados.** Escolha uma opção:
   - Com Docker, que já cria o banco `fintrack` com o usuário e a senha do `.env.example`:
     ```bash
     docker run --name fintrack-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=fintrack -p 5432:5432 -d postgres:16
     ```
   - Com o PostgreSQL instalado na máquina: `createdb -h localhost -U postgres fintrack`.
2. **Back-end:**
   ```bash
   cd backend
   cp .env.example .env
   npm install
   npm run db:schema         # cria as tabelas (apaga as existentes)
   npm run db:seed           # usuários de demonstração (ver "Seed de demonstração")
   npm run dev               # http://localhost:3000
   ```
   No `.env`, confira o `DATABASE_URL` e troque o `JWT_SECRET` por um valor aleatório de pelo menos 32 caracteres. Para gerar um: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. Com o valor do exemplo, a API sobe com um aviso em desenvolvimento e não sobe com `NODE_ENV=production`.
3. **Front-end** (em outro terminal, também a partir da raiz):
   ```bash
   cd frontend
   cp .env.example .env
   npm install
   npm run dev               # http://localhost:5173
   ```
4. Abra http://localhost:5173 e entre com `ana@email.com` / `senha1234`.

### Variáveis de ambiente
| Arquivo | Variável | Para que serve | Padrão no exemplo |
|---|---|---|---|
| `backend/.env` | `PORT` | porta da API | `3000` |
| | `DATABASE_URL` | conexão com o PostgreSQL (obrigatória) | `postgresql://postgres:postgres@localhost:5432/fintrack` |
| | `JWT_SECRET` | assinatura dos tokens (obrigatória, 32+ caracteres) | valor de exemplo, troque |
| | `JWT_EXPIRES_IN` | validade do token | `1h` |
| | `CORS_ORIGIN` | origens do front permitidas, separadas por vírgula (obrigatória em produção) | `http://localhost:5173` |
| | `LOGIN_RATE_LIMIT_MAX` | logins que falham por IP a cada 15 min | `10` |
| | `CADASTRO_RATE_LIMIT_MAX` | cadastros por IP por hora | `20` |
| | `TRUST_PROXY` | número de proxies à frente da API, para o limite ver o IP real (opcional) | desligado |
| | `ANTHROPIC_API_KEY`, `IA_MODELO` | dicas extras por IA na Saúde financeira (opcional) | desligado |
| `frontend/.env` | `VITE_API_URL` | endereço da API usado pelo front | `http://localhost:3000/api` |

Usuários do seed: `ana@email.com` e `bruno@email.com` (senha `senha1234`).

### Seed de demonstração
`npm run db:seed` grava os dados de exemplo do design (Figma) numa única transação. É idempotente: reaproveita a linha de cada usuário de demonstração (pelo e-mail), apaga só as categorias, fontes e lançamentos dele e grava tudo de novo. Os ids não mudam, então quem já está logado como Ana continua com a sessão válida. Outras contas não são tocadas. Se outra conta já usar o CPF de um usuário de demonstração, o seed para e não altera nada. Com `NODE_ENV=production` ele se recusa a rodar, e antes de gravar mostra o banco de destino. Os dados ficam em `backend/database/demonstracao.js`.

**Datas.** Os dados estão escritos com as datas do design (setembro a novembro de 2026), e o seed desloca tudo para o mês em que roda: "novembro de 2026" vira o mês atual, e o resto acompanha. Rodando em novembro de 2026, as telas ficam idênticas ao Figma. Em outro mês, os valores e as faturas continuam os mesmos e só mudam os meses exibidos. Para a demonstração, rode o seed no mesmo mês em que for apresentar.

- **Ana Souza** (`ana@email.com`): categorias padrão; fontes Salário (renda), Conta corrente, Poupança (reserva), Nubank (fecha dia 3, vence dia 10, limite R$ 8.000,00) e Visa crédito (fecha dia 25, vence dia 5, limite R$ 5.000,00).
  - **Novembro de 2026** (mês atual): os 8 lançamentos da lista do design (entradas R$ 7.350,00 e saídas R$ 2.216,64) mais a parcela 3/10 do Notebook.
  - **Compras parceladas no Visa**: Cabo e carregador (R$ 100,00 em 3×, a partir de 15/11/2026) e Notebook (R$ 4.500,00 em 10×, a partir de 20/09/2026).
  - **Setembro e outubro** (os dois meses anteriores): aluguel, alimentação e mobilidade com os valores do relatório por categoria do design (outubro R$ 1.500,00 / R$ 980,50 / R$ 769,50; setembro R$ 1.500,00 / R$ 870,00 / R$ 812,30), salário e dois freelas de R$ 1.000,00 depositados na Poupança, que formam a reserva de emergência.
- **Bruno Lima** (`bruno@email.com`): caso de estresse, sem cartões. Tem 64 lançamentos em novembro de 2026 (4 páginas), uma descrição de 120 caracteres, um lançamento de R$ 1.234.567,89 e a categoria "Manutenção da casa, reformas, consertos e imprevistos do mês" (60 caracteres, o máximo).

**O que bate com o design.** Faturas do Visa: 12/2026 R$ 555,34 (Cinema, Cabo 1/3 e Notebook 3/10), 01/2027 e 02/2027 R$ 483,33 e 03/2027 R$ 450,00, com R$ 3.772,00 de limite utilizado e R$ 1.228,00 disponível. Nubank: fatura 12/2026 de R$ 361,30. Esses valores aparecem iguais em Faturas, nas "Próximas faturas" do Resumo e em Fontes e destinos. Os testes em `backend/test/seed.test.js` conferem esses números com "hoje" fixo em 22/11/2026 e também com o seed deslocado para fevereiro de 2027. Na tela, as faturas batem entre o dia 6 e o dia 24 do mês em que o seed rodou. Fora disso, elas avançam normalmente pela regra de fechamento.

**Divergências conhecidas.** No documento de design, o Notebook 3/10 está na fatura do Visa, mas não na lista nem nos totais de novembro. Decidimos manter o Notebook, porque sem ele nenhuma tela de cartão bateria. Com isso, novembro fica com saídas de R$ 2.666,64 e saldo de R$ 4.683,36 (no design: R$ 2.216,64 e R$ 5.133,36), e o Visa aparece com R$ 555,34 no relatório por fonte/destino (no design: R$ 105,34). Pelo mesmo motivo, as parcelas 1/10 e 2/10 entram em setembro e outubro como Educação. Os saldos das contas no design (Conta corrente R$ 3.133,36 e Poupança R$ 2.000,00) não podem ser reproduzidos, porque o `saldo` da API é o movimento do mês na conta (ver "Relatório por fonte/destino"). No seed, a Conta corrente fica com −R$ 1.200,00 em novembro. A Poupança fica com R$ 0,00 no mês e R$ 2.000,00 acumulados, que é o que a reserva de emergência da Saúde financeira usa.

### Roteiro de verificação da API
[`docs/roteiro-seguranca.http`](docs/roteiro-seguranca.http) reúne requisições prontas (formato [httpyac](https://httpyac.github.io/), extensão do VS Code ou CLI), com o resultado esperado em cada uma como asserção: cadastro duplicado (e-mail/CPF), login, acesso sem token (401), isolamento entre usuários (404) e compra parcelada. Com a API no ar (`npm run dev`) e o banco populado (`npm run db:seed`), rode tudo de uma vez:
```bash
npx httpyac send docs/roteiro-seguranca.http --all
```
O login com senha errada conta para o limite de tentativas (10 em 15 min por IP): se rodar o roteiro muitas vezes seguidas e começar a receber 429, espere ou reinicie a API.

### Testes do back-end
```bash
cd backend
npm test                                  # testes unitários (sem banco)

# + testes de integração (rotas, relatórios, segurança e seed): precisam de um banco de teste exclusivo,
# cujo schema é recriado a cada execução (o nome do banco deve conter "test")
createdb -h localhost -U postgres fintrack_test   # com Docker: docker exec fintrack-db createdb -U postgres fintrack_test
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fintrack_test npm test
```

### Verificação do front-end
```bash
cd frontend
npm run lint
npm run build
```

## Rotas
Todas ficam sob `/api` e respondem JSON. As marcadas com 🔒 exigem `Authorization: Bearer <token>`. Erros seguem o padrão `{ erro, campos? }` (ver "Segurança"), e recurso de outro usuário devolve `404`, igual a um id que não existe.

| Método | Rota | 🔒 | O que faz |
|---|---|---|---|
| `GET` | `/health` | | verifica a API e a conexão com o banco |
| `POST` | `/auth/cadastro` | | cria a conta com categorias padrão e uma conta corrente (`201`; `409` com e-mail ou CPF já usados; limite de cadastros por IP) |
| `POST` | `/auth/login` | | devolve `{ token, usuario }` (`401` com credenciais inválidas; `429` depois de muitas tentativas que falham) |
| `GET` | `/auth/me` | 🔒 | dados do usuário logado |
| `GET` | `/categorias?tipo=entrada\|saida` | 🔒 | lista as categorias, com o total de lançamentos de cada uma |
| `POST` | `/categorias` | 🔒 | cria uma categoria (nome único por usuário e tipo) |
| `PUT` | `/categorias/:id` | 🔒 | edita (`409` ao mudar o tipo de uma categoria com lançamentos) |
| `DELETE` | `/categorias/:id` | 🔒 | exclui (`409` se tiver lançamentos) |
| `GET` | `/fontes-destinos?tipo=renda\|conta\|cartao_credito` | 🔒 | lista rendas, contas e cartões |
| `POST` | `/fontes-destinos` | 🔒 | cria (cartão exige dia de fechamento, dia de vencimento e limite) |
| `PUT` | `/fontes-destinos/:id` | 🔒 | edita (ver "Regras de fontes e destinos") |
| `DELETE` | `/fontes-destinos/:id` | 🔒 | exclui (`409` se tiver lançamentos) |
| `GET` | `/lancamentos` | 🔒 | lista com filtros, paginação e totais (ver "Listagem de lançamentos") |
| `GET` | `/lancamentos/:id` | 🔒 | um lançamento |
| `POST` | `/lancamentos` | 🔒 | cria, com `parcelas` opcional no cartão (ver "Lançamentos e parcelamento") |
| `PUT` / `PATCH` | `/lancamentos/:id` | 🔒 | edita por completo ou em parte |
| `DELETE` | `/lancamentos/:id[?todasParcelas=true]` | 🔒 | exclui o lançamento ou a compra parcelada inteira |
| `GET` | `/relatorios/categorias?inicio=&fim=` | 🔒 | totais por categoria com comparação ao período anterior |
| `GET` | `/relatorios/fontes-destinos?inicio=&fim=` | 🔒 | entradas por fonte, saídas por destino e saldo por conta |
| `GET` | `/relatorios/faturas?meses=3` | 🔒 | faturas de cada cartão e limite utilizado (ver "Faturas de cartão") |
| `GET` | `/saude-financeira` | 🔒 | indicadores, projeção de saldo e dicas do mês corrente |

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

### Saúde financeira
`GET /api/saude-financeira` (autenticado) calcula no servidor, para o **mês corrente** (fuso de São Paulo), 6 indicadores, a projeção de saldo e as dicas:

```jsonc
{
  "referencia": "2026-11",
  "aviso": "Informações educativas, não constituem recomendação financeira profissional.",
  "indicadores": [{
    "id": "taxa_poupanca", "titulo": "Taxa de poupança", "valor": 4, "unidade": "percentual",
    "status": "alerta",   // bom | atencao | alerta | info
    "mensagem": "Você guardou 4% da sua renda em novembro. Uma meta comum é guardar pelo menos 10%."
  }],
  "projecao": {
    "saldo_inicial": 5133.36, "renda_mensal_estimada": 5000, "gasto_mensal_estimado": 3200,
    "serie": [{ "mes": "2026-11", "saldo": 5133.36 }],   // 6 pontos: o mês corrente e os 5 seguintes
    "fica_negativo": false, "primeiro_mes_negativo": null, "mensagem": "…"
  },
  "dicas": [{ "id": "poupanca", "texto": "…", "origem": "regras" }]   // origem: regras | ia
}
```

`valor` é `null` quando falta dado (o `status` vem `info` e a `mensagem` explica o que registrar); na regra 50/30/20 é `{ necessidades, desejos, poupanca }`. `unidade` diz como exibir: `percentual`, `meses`, `reais`, `variacao` ou `proporcao`.

**Como cada indicador é calculado** (valores em % da renda do mês, isto é, a soma das entradas do mês corrente; sem entradas, os indicadores que dependem dela vêm `info`):

| Indicador | Cálculo | Status |
|---|---|---|
| Taxa de poupança | (entradas − saídas do mês) ÷ entradas | ≥ 10% bom · 5% a 10% atenção · < 5% (ou negativa) alerta |
| Comprometimento com cartões | soma das 3 primeiras faturas a pagar de cada cartão ÷ renda do mês: a atual aberta + 2, ou, entre o fechamento e o vencimento, a fatura fechada que ainda vence + a atual + 1 | ≤ 30% bom · ≤ 70% atenção · > 70% alerta |
| Reserva de emergência | saldo das contas marcadas como `reserva` (entradas − saídas nelas, até hoje) ÷ despesa mensal média | ≥ 3 meses bom · ≥ 2 atenção · < 2 alerta |
| Parcelas futuras | soma das saídas parceladas com data depois do mês corrente; a mensagem diz até que mês | sempre `info` |
| Regra 50/30/20 | necessidades, desejos e poupança em % da renda | dentro da meta (≤ 50 / ≤ 30 / ≥ 20) bom · 1 fora atenção · 2 ou 3 fora alerta |
| Categoria fora da curva | maior alta do gasto do mês corrente (até hoje) sobre o mês anterior inteiro | < 10% bom · ≥ 10% atenção · ≥ 30% alerta |

- **Categoria fora da curva é parcial até o fim do mês**: o mês corrente, ainda em andamento, é comparado com o anterior inteiro. No começo do mês quase toda categoria aparece com variação negativa (`bom`), e o indicador, assim como a dica `fora_da_curva`, só fica fiel perto do fim do mês. Quando há alta relevante (`atencao`/`alerta`), o `titulo` leva a categoria ("Alimentação fora da curva"); nos demais casos ele é "Categoria fora da curva".
- **Despesa mensal média**: média das saídas dos 3 meses anteriores que tiveram movimento; sem histórico, usa o mês corrente. A renda média da projeção segue a mesma regra.
- **Necessidades** na 50/30/20: categorias cujo nome (sem acento e maiúsculas) é moradia, alimentação, saúde, educação, mobilidade, transporte, aluguel, condomínio, mercado, supermercado, contas ou impostos. Todo o resto é "desejos". A poupança é o que sobra da renda e nunca passa de 0% para baixo.
- **Fora da curva**: só compara categorias que tiveram pelo menos R$ 50,00 no mês anterior (evita "+900%" sobre centavos).
- **Projeção (6 meses)**: parte do saldo realizado (entradas − saídas com data até hoje, em todas as contas e cartões) e soma mês a mês a renda média, menos o gasto médio à vista, menos as parcelas já registradas daquele mês. No mês corrente entra só a fração de dias que falta. `fica_negativo` e `primeiro_mes_negativo` sinalizam quando o saldo cai abaixo de zero.
- **Dicas** (até 5, por regras): saldo negativo, poupança abaixo da meta, cartão com 70% ou mais do limite usado, categoria fora da curva, reserva abaixo de 3 meses e 50/30/20 fora da meta. Sem nenhum gatilho, vem uma dica de manutenção, nunca uma lista vazia.

**Limites e referências.** As metas (10% de poupança, 3 a 6 meses de reserva, 50/30/20) são referências educativas comuns, não recomendação financeira; por isso a resposta sempre traz `aviso`. Limitações: a projeção é uma extrapolação do passado recente (não prevê aumento de salário, férias nem compras futuras à vista); a reserva só considera lançamentos feitos na própria conta de reserva (uma transferência registrada como saída de outra conta não aparece lá); e as saídas no cartão contam na data da compra (ou da parcela), não no pagamento da fatura.

**Dicas por IA (opcional).** Se `ANTHROPIC_API_KEY` estiver no `.env` (modelo em `IA_MODELO`, padrão `claude-haiku-5-5`), até 2 dicas extras da IA vêm depois das dicas por regras, com `origem: "ia"`. Só saem do servidor o `id`, o `status` e o `valor` de cada indicador: nenhum nome, e-mail, CPF, descrição de lançamento ou nome de conta/cartão. A chamada usa esforço baixo e saída estruturada (JSON `{ "dicas": [...] }`), lê o texto no bloco do tipo `text` (podem vir blocos de `thinking` antes) e tem limite de 4 s e, em qualquer falha (sem chave, rede, tempo esgotado, erro do serviço, resposta fora do formato), a rota segue normalmente só com as dicas por regras e registra um aviso no log do servidor.

### Segurança (revisão BE-10)
Cada item do checklist abaixo tem teste automatizado (`backend/test/seguranca*.test.js`; os que usam o banco rodam com `TEST_DATABASE_URL`).

| Item | Como está | Onde |
|---|---|---|
| CORS restrito | Só as origens de `CORS_ORIGIN` (lista separada por vírgula; `*` é recusado e, em produção, a variável é obrigatória). Métodos `GET/POST/PUT/PATCH/DELETE` e cabeçalhos `Authorization`/`Content-Type`. Outras origens não recebem cabeçalho CORS. | `config/ambiente.js`, `app.js` |
| Rate limit no login | 10 tentativas **que falham** por IP a cada 15 min (`LOGIN_RATE_LIMIT_MAX`); depois, `429`. Acertos e pedidos inválidos (`400`) não contam. O cadastro também é limitado (20 por IP por hora, `CADASTRO_RATE_LIMIT_MAX`), porque o `409` revela e-mails e CPFs já usados. Atrás de proxy, defina `TRUST_PROXY` com o **número de proxies** à frente do servidor (ex.: `1`) para o limite enxergar o IP real; também aceita `loopback`, lista de IPs/sub-redes e `false`. Evite `true`: o cliente passa a forjar o IP pelo `X-Forwarded-For` e escapa do limite (a subida avisa). | `middlewares/limitarLogin.js` |
| Consultas parametrizadas | Todos os valores vão em `$1, $2...`. Os poucos trechos de SQL montados por interpolação são constantes do código (`SELECT_COM_TOTAL`, `filtro`, `ORDEM`...) e índices de parâmetro. Um teste lê o código-fonte e falha se qualquer SQL interpolar outra coisa. | `test/seguranca.test.js` |
| Validação e sanitização | Tipos, tamanhos, intervalos e datas validados antes de chegar ao banco (corpo, query e `:id`). Nomes e descrições trocam tab e quebras de linha por espaço e perdem os demais caracteres de controle (incluindo os C1 e os de direção do Unicode, que inverteriam a exibição do texto), além dos espaços nas pontas (o `NUL` derrubaria o Postgres com `500`); e-mail e senha com caracteres de controle são recusados (o bcrypt cortaria a senha no `NUL`). HTML não é alterado: a API só devolve JSON e o front escapa na exibição. Corpo acima de 100 KB dá `413`. | `utils/texto.js`, `middlewares/validar*.js` |
| Sem `senha_hash` nas respostas | Cadastro, login e `/me` devolvem só `id`, `nome` e `email` (o CPF também não volta). Um teste varre as respostas procurando `senha_hash`, hash bcrypt, senha e CPF. | `models/usuario.js` |
| Padrão `{ erro, campos }` | `erro` é sempre texto; `campos` (`{ campo: mensagem }`) aparece nos `400` de validação e nos `409` de um campo específico. Erros do leitor de JSON deixam de virar `500`: JSON malformado é `400`, corpo grande é `413`, charset não suportado é `415`. O `500` nunca mostra detalhes do erro. | `middlewares/erros.js` |
| Códigos HTTP | `200/201/204` sucesso; `400` dados inválidos; `401` sem token, token inválido ou expirado; `404` recurso inexistente ou de outro usuário; `409` conflito (nome repetido, item com lançamentos); `429` limite de tentativas; `500` erro interno. | todas as rotas |
| Recurso de outro usuário = `404` | Toda consulta filtra por `usuario_id`. `GET/PUT/PATCH/DELETE` de categoria, fonte/destino ou lançamento de outra pessoa devolve o mesmo `404` de um id que não existe, assim como `:id` malformado (checado antes do corpo, no middleware `exigirIdValido`, que entrega o id convertido em `req.idRecurso`). Os testes tentam todas as rotas com `:id` e confirmam que o dado original não mudou. Ao **criar** um lançamento apontando para categoria/fonte de outra pessoa, a resposta é `400` em `campos.categoriaId`/`campos.fonteDestinoId` (o id está no corpo, não na URL) e nada é gravado. | `models/*.js`, `middlewares/validarId.js` |
| `.env` fora do Git | `.env` e `.env.*` estão no `.gitignore` (só `.env.example` é versionado) e nunca foram commitados. Na subida, o servidor exige `DATABASE_URL` e `JWT_SECRET`; segredo com menos de 32 caracteres (ou o do `.env.example`) gera aviso e, com `NODE_ENV=production`, impede a subida. | `.gitignore`, `config/ambiente.js` |
| Cabeçalhos | `X-Powered-By` desligado; `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer` e `Cache-Control: no-store` (dados financeiros não ficam em cache). | `middlewares/cabecalhosSeguranca.js` |

Limitações conhecidas: o limite de tentativas é por IP (não por conta) e fica na memória do processo, então reinicia com o servidor e não é compartilhado entre instâncias; o JWT dura `JWT_EXPIRES_IN` (1 h) e não há revogação antes disso.

## Design system (front-end)
- Tokens do Figma em `frontend/src/index.css`, com modo claro e escuro (`[data-theme="dark"]`). Use as classes do Tailwind (`bg-surface`, `text-text-muted`, `border-border-strong`...), sem cores soltas.
- Componentes base em `frontend/src/components/ui`:
  - formulário: `Button`, `Input`, `InputSenha`, `Select`, `Campo`, `Segmentado`, `Chave`, `FiltroSelect`, `SeletorPeriodo` e `SeletorIntervalo`;
  - exibição: `Badge`, `MoneyText`, `BarraLimite`, `Abas` (com `PainelAba`), `Paginacao` e `MenuAcoes`;
  - camadas: `Gaveta`, `Dialogo`, `DialogoConfirmarExclusao` e `DialogoExclusaoBloqueada`;
  - estados: `Carregando`, `ListaVazia`, `Aviso`, `BannerErro`, `MensagemErro` e `EstadoPagina`.
- Ícones: Material Icons (Outlined) com `<Icone nome="add" />`, usando o nome do ícone do Figma.
- Estados globais (`EstadoPagina`): no carregamento inicial de uma página, chame `mostrarErro(erro)` de `useOutletContext()` no `catch`. Falha de rede (requisição enviada sem resposta) mostra "sem conexão", 5xx mostra "erro do servidor" e 404 mostra "não encontrado" (inclusive item de outra conta), no lugar da página e sem a topbar; a função devolve `false` para os demais erros (outros status, requisição cancelada ou erro de código), que seguem na própria página. Erros de formulário e de exclusão não passam por ela. A tela some a cada navegação (inclusive voltar/avançar do navegador), em "Tentar de novo" e, no caso de sem conexão, quando a internet volta. "Tentar de novo" monta a página do zero: o período se mantém, mas filtros e paginação de Lançamentos voltam ao padrão. Rota desconhecida mostra o "não encontrado" dentro do shell. 401 de sessão expirada limpa a sessão e leva ao login com o banner.
- Foco inicial em `Gaveta` e `Dialogo`: marque o campo com `data-autofocus` (não `autoFocus`). O `autoFocus` do React roda antes de o `<dialog>` abrir e o foco acaba no botão "Fechar".
- Fechamento de `Gaveta` e `Dialogo` (`useDialogoNativo`): Esc e clique fora não fecham o `<dialog>` direto; chamam `aoFechar` e quem usa o componente decide (ex.: a gaveta de lançamento pergunta "Descartar alterações?"). Se o navegador fechar mesmo assim (alguns ignoram o cancelamento no Esc repetido), o diálogo é reaberto e `aoFechar` é chamado, para o estado do React e o do DOM não se desencontrarem. Com `bloqueada`, nada fecha.
