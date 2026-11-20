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
Implementadas até agora: `GET /api/health`, `POST /api/auth/cadastro`, `POST /api/auth/login` (limite de tentativas; ajustável por `LOGIN_RATE_LIMIT_MAX`) e `GET /api/auth/me` (requer `Authorization: Bearer <token>`), além do CRUD de `/api/categorias` e de `/api/fontes-destinos` (`GET`/`POST` e `PUT`/`DELETE` em `/:id`, todos autenticados) e de `POST /api/lancamentos`, `PUT`/`PATCH /api/lancamentos/:id` e `DELETE /api/lancamentos/:id[?todasParcelas=true]`. As demais (listagem de lançamentos, relatórios) seguem a tabela 10.5 do enunciado e serão adicionadas.

### Lançamentos e parcelamento
- Corpo: `{ tipo, valor, descricao, data (AAAA-MM-DD), categoriaId, fonteDestinoId, parcelas? }`. A categoria e a fonte/destino precisam ser do usuário e a categoria precisa ter o mesmo tipo do lançamento. Erros vêm por campo em `{ erro, campos }` (ex.: `campos.valor`, `campos.categoriaId`), todos de uma vez.
- `parcelas` (1–48) só vale quando o destino é cartão de crédito. Cada parcela é um lançamento próprio com `parcela_atual`, `total_parcelas` e o mesmo `grupo_parcelamento` (UUID), gravados numa única transação: ou todas entram, ou nenhuma.
- O valor é dividido em centavos e o resto vai para a 1ª parcela: R$ 100,00 em 3× = 33,34 + 33,33 + 33,33.
- `POST` devolve `201` com a lista das parcelas criadas (um item quando não há parcelamento).
- `PUT`/`PATCH` editam um lançamento (uma parcela por vez) com as mesmas validações; o número de parcelas não muda depois de criado. `DELETE` remove só o lançamento ou, com `?todasParcelas=true`, todas as parcelas da compra.

**Decisão sobre a data das parcelas:** guardamos em cada parcela a data da compra + (k−1) meses (ajustada ao último dia do mês quando necessário, ex.: 31/01 → 28/02). Assim a lista de cada mês mostra só a parcela daquele mês (em novembro aparece apenas a 1/3), como no design. A fatura em que cada parcela cai é calculada a partir dessa data por `calcularFatura` (`models/faturas.js`).

## Design system (front-end)
- Tokens do Figma em `frontend/src/index.css`, com modo claro e escuro (`[data-theme="dark"]`). Use as classes do Tailwind (`bg-surface`, `text-text-muted`, `border-border-strong`...), sem cores soltas.
- Componentes base em `frontend/src/components/ui`: `Button`, `Badge`, `Input`, `Select`, `Segmentado` e `MoneyText`.
- Ícones: Material Icons (Outlined) com `<Icone nome="add" />`, usando o nome do ícone do Figma.
