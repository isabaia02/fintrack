# FinTrack, controle financeiro pessoal

Projeto da disciplina **ES47B - Programação Web Fullstack**: API REST (Node.js/Express + PostgreSQL) e SPA (React + Vite).

| Aluno | RA |
|---|---|
| Isadora Costa Baia | 2614685 |
| Pedro Henrique Zanatta de Oliveira | 2601443 |

Design: [Figma](https://www.figma.com/design/kiJuYs1GQALZBR62vMNZVw/Untitled).

## Tecnologias
- **Back-end:** Node.js, Express 5, pg, bcrypt, jsonwebtoken, cors, dotenv e express-rate-limit. Testes com `node:test`.
- **Front-end:** React 19, Vite 8, React Router 7, Axios, Recharts 3, Tailwind CSS 4 e Material Icons. Lint com oxlint.
- **Banco:** PostgreSQL 16.

## Estrutura
```
backend/
  database/      schema.sql, run-schema.js, seed.js, demonstracao.js
  src/           server.js, app.js, routes/, models/, middlewares/, config/, services/, utils/
  test/          testes unitários e de integração
frontend/src/    components/ (ui/ = design system), contexts/, hooks/, services/api.js, utils/
docs/            roteiro-seguranca.http
```

## Como rodar
Pré-requisitos: Node.js 20.19+ (ou 22.12+) e PostgreSQL.

1. Crie o banco `fintrack`. Com Docker:
   ```bash
   docker run --name fintrack-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=fintrack -p 5432:5432 -d postgres:16
   ```
   Ou, com o PostgreSQL instalado: `createdb -h localhost -U postgres fintrack`.
2. Back-end:
   ```bash
   cd backend
   cp .env.example .env
   npm install
   npm run db:schema         # cria as tabelas (apaga as existentes)
   npm run db:seed           # usuários de demonstração
   npm run dev               # http://localhost:3000
   ```
   No `.env`, troque o `JWT_SECRET` por um valor aleatório de 32+ caracteres: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
3. Front-end, em outro terminal:
   ```bash
   cd frontend
   cp .env.example .env
   npm install
   npm run dev               # http://localhost:5173
   ```
4. Entre com `ana@email.com` / `senha1234`.

### Variáveis de ambiente
| Arquivo | Variável | Uso | Exemplo |
|---|---|---|---|
| `backend/.env` | `PORT` | porta da API | `3000` |
| | `DATABASE_URL` | conexão com o banco (obrigatória) | `postgresql://postgres:postgres@localhost:5432/fintrack` |
| | `JWT_SECRET` | assinatura dos tokens (obrigatória, 32+ caracteres) | troque o do exemplo |
| | `JWT_EXPIRES_IN` | validade do token | `1h` |
| | `CORS_ORIGIN` | origens permitidas, separadas por vírgula | `http://localhost:5173` |
| | `LOGIN_RATE_LIMIT_MAX` | logins que falham por IP a cada 15 min | `10` |
| | `CADASTRO_RATE_LIMIT_MAX` | cadastros por IP por hora | `20` |
| | `TRUST_PROXY` | número de proxies à frente da API (opcional) | desligado |
| | `ANTHROPIC_API_KEY`, `IA_MODELO` | dicas extras por IA (opcional) | desligado |
| `frontend/.env` | `VITE_API_URL` | endereço da API | `http://localhost:3000/api` |

## Seed de demonstração
`npm run db:seed` grava os dados de exemplo do design numa transação. Pode rodar de novo: mantém os ids dos usuários, regrava só os dados deles e não toca em outras contas. Não roda com `NODE_ENV=production`. Os dados ficam em `backend/database/demonstracao.js`.

- **Ana Souza** (`ana@email.com`, senha `senha1234`): fontes Salário, Conta corrente, Poupança (reserva), Nubank (fecha dia 3, vence dia 10, limite R$ 8.000,00) e Visa crédito (fecha dia 25, vence dia 5, limite R$ 5.000,00). Lançamentos de setembro a novembro, com o Cabo e carregador em 3× e o Notebook em 10× no Visa.
- **Bruno Lima** (`bruno@email.com`, senha `senha1234`): caso de estresse, sem cartões. Tem 64 lançamentos no mês, uma descrição de 120 caracteres, um valor de R$ 1.234.567,89 e uma categoria de 60 caracteres.

As datas do design (novembro de 2026) são deslocadas para o mês em que o seed roda, então as telas mostram os mesmos valores em qualquer mês. Faturas do Visa: R$ 555,34, R$ 483,33, R$ 483,33 e R$ 450,00, com R$ 3.772,00 de limite usado. Nubank: R$ 361,30.

Diferenças em relação ao design:
- O Notebook 3/10 entra em novembro para as faturas baterem, então as saídas do mês ficam em R$ 2.666,64 (no design, R$ 2.216,64).
- O saldo das contas é o movimento do mês, então a Conta corrente aparece com −R$ 1.200,00 (no design, R$ 3.133,36).

## Testes
```bash
cd backend
npm test                                   # unitários
createdb -h localhost -U postgres fintrack_test
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fintrack_test npm test   # + integração

cd frontend
npm run lint
npm run build
```
Com Docker, crie o banco de teste com `docker exec fintrack-db createdb -U postgres fintrack_test`. O nome do banco precisa conter "test", porque o schema é recriado a cada execução.

O roteiro [`docs/roteiro-seguranca.http`](docs/roteiro-seguranca.http) ([httpyac](https://httpyac.github.io/)) cobre cadastro duplicado, login, acesso sem token, isolamento entre usuários e compra parcelada. Com a API no ar, rode `npx httpyac send docs/roteiro-seguranca.http --all`. Ele consome tentativas de login: se começar a receber `429`, reinicie a API.

## Rotas
Todas ficam sob `/api` e respondem JSON. As marcadas com "sim" exigem `Authorization: Bearer <token>`. Erros seguem o formato `{ erro, campos? }`, e recurso de outro usuário devolve `404`.

| Método | Rota | Token | O que faz |
|---|---|---|---|
| `GET` | `/health` | | verifica a API e o banco |
| `POST` | `/auth/cadastro` | | cria a conta com categorias padrão e uma conta corrente (`409` com e-mail ou CPF já usados) |
| `POST` | `/auth/login` | | devolve `{ token, usuario }` (`401` com credenciais inválidas, `429` depois de muitas falhas) |
| `GET` | `/auth/me` | sim | usuário logado |
| `GET` | `/categorias?tipo=entrada\|saida` | sim | lista, com o total de lançamentos de cada uma |
| `POST` | `/categorias` | sim | cria (nome único por usuário e tipo) |
| `PUT` | `/categorias/:id` | sim | edita (`409` ao mudar o tipo de uma categoria com lançamentos) |
| `DELETE` | `/categorias/:id` | sim | exclui (`409` se tiver lançamentos) |
| `GET` | `/fontes-destinos?tipo=renda\|conta\|cartao_credito` | sim | lista rendas, contas e cartões |
| `POST` | `/fontes-destinos` | sim | cria (cartão exige fechamento, vencimento e limite) |
| `PUT` | `/fontes-destinos/:id` | sim | edita (`409` ao mudar tipo ou dias de um item com lançamentos) |
| `DELETE` | `/fontes-destinos/:id` | sim | exclui (`409` se tiver lançamentos) |
| `GET` | `/lancamentos?inicio=&fim=&tipo=&categoriaId=&fonteDestinoId=&pagina=` | sim | lista 20 por página, com totais do período |
| `GET` | `/lancamentos/:id` | sim | um lançamento |
| `POST` | `/lancamentos` | sim | cria, com `parcelas` (1–48) opcional no cartão |
| `PUT` / `PATCH` | `/lancamentos/:id` | sim | edita por completo ou em parte |
| `DELETE` | `/lancamentos/:id[?todasParcelas=true]` | sim | exclui o lançamento ou a compra parcelada inteira |
| `GET` | `/relatorios/categorias?inicio=&fim=` | sim | totais por categoria comparados ao período anterior |
| `GET` | `/relatorios/fontes-destinos?inicio=&fim=` | sim | entradas por fonte, saídas por destino e saldo por conta |
| `GET` | `/relatorios/faturas?meses=3` | sim | faturas de cada cartão e limite usado |
| `GET` | `/saude-financeira` | sim | indicadores, projeção de saldo e dicas do mês |

Sem `inicio` e `fim`, listagem e relatórios usam o mês corrente no fuso de São Paulo.

## Regras e decisões
### Parcelamento
- Só saídas no cartão podem ser parceladas. Cada parcela é um lançamento com `parcela_atual`, `total_parcelas` e o mesmo `grupo_parcelamento`, gravados numa transação.
- O valor é dividido em centavos, e o resto vai para a 1ª parcela: R$ 100,00 em 3× = 33,34 + 33,33 + 33,33. No `POST`, `valor` é o total da compra; depois, é o valor da parcela.
- **Data das parcelas:** data da compra + (k − 1) meses, ajustada ao último dia do mês quando preciso (31/01 → 28/02). Assim cada mês mostra só a sua parcela, e a fatura de cada parcela é calculada a partir dessa data.
- Editar uma parcela muda só `valor` e `data` dela; descrição, categoria e cartão valem para a compra toda. O número de parcelas não muda depois de criado.
- Ao excluir uma parcela, as outras são renumeradas (1/3 e 3/3 viram 1/2 e 2/2).

### Faturas
- A fatura de uma compra é definida pelo dia de fechamento do cartão; compra no dia do fechamento vai para a fatura seguinte.
- A lista traz a fatura atual (aberta) e as `meses` seguintes. Entre o fechamento e o vencimento, a fatura fechada e ainda não paga aparece antes da atual.
- **Limite usado** = saídas do cartão em faturas ainda não vencidas. Estornos não são abatidos.
- Com lançamentos, um cartão não pode mudar de tipo nem de dias de fechamento ou vencimento, para as faturas não mudarem retroativamente.

### Relatórios
- O período anterior tem o mesmo tamanho: mês inteiro compara com o mês anterior; um intervalo de dias compara com os mesmos dias logo antes.
- O "saldo" de uma conta é o movimento dela no período (entradas − saídas lançadas na conta), e não o saldo acumulado.

### Saúde financeira (desafio)
Calculada no servidor para o mês corrente. A resposta sempre traz o aviso "Informações educativas, não constituem recomendação financeira profissional."

| Indicador | Cálculo | Bom |
|---|---|---|
| Taxa de poupança | (entradas − saídas) ÷ entradas | ≥ 10% |
| Comprometimento com cartões | 3 próximas faturas ÷ renda do mês | ≤ 30% |
| Reserva de emergência | saldo das contas de reserva ÷ despesa média | ≥ 3 meses |
| Parcelas futuras | soma das parcelas após o mês corrente | informativo |
| Regra 50/30/20 | necessidades, desejos e poupança em % da renda | dentro da meta |
| Categoria fora da curva | maior alta de gasto sobre o mês anterior | < 10% |

- **Projeção de 6 meses:** parte do saldo atual e soma a renda média, menos o gasto médio, menos as parcelas já registradas.
- **Dicas:** até 5, geradas por regras. Com `ANTHROPIC_API_KEY`, até 2 dicas extras por IA, que recebem só os valores dos indicadores, sem dados pessoais. Se a IA falhar, a rota continua com as dicas por regras.

### Segurança
- CORS restrito às origens de `CORS_ORIGIN`.
- Limite de tentativas no login (só as que falham) e no cadastro.
- Consultas sempre parametrizadas; um teste falha se algum SQL interpolar entrada do usuário.
- Validação no servidor; nomes e descrições perdem caracteres de controle. Corpo acima de 100 KB devolve `413`.
- Respostas nunca trazem `senha_hash` nem CPF.
- Toda consulta filtra pelo usuário logado, e recurso de outra pessoa devolve `404`.
- `.env` fica fora do Git; a API não sobe sem `DATABASE_URL` e `JWT_SECRET`.
- Cabeçalhos de segurança e `Cache-Control: no-store`.

## Design system (front-end)
- Tokens do Figma em `frontend/src/index.css`, com modo claro e escuro (`[data-theme="dark"]`). Use as classes do Tailwind (`bg-surface`, `text-text-muted`...), sem cores soltas.
- Componentes base em `frontend/src/components/ui` (`Button`, `Input`, `Select`, `Gaveta`, `Dialogo`, `MoneyText`, `EstadoPagina`...).
- Ícones: Material Icons (Outlined) com `<Icone nome="add" />`, usando o nome do Figma.
- Estados globais: no carregamento de uma página, chame `mostrarErro(erro)` de `useOutletContext()` no `catch`. Sem conexão, erro 5xx e 404 aparecem no lugar da página, e sessão expirada leva ao login.
- Em `Gaveta` e `Dialogo`, marque o campo inicial com `data-autofocus` (não `autoFocus`).
