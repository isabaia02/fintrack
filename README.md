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
    models/        acesso ao banco e regras (cpf.js, faturas.js)
    middlewares/   autenticar.js (JWT), limitarLogin.js, validarCadastro.js, erros.js
    config/        db.js (pool), jwt.js
frontend/src/
  components/  páginas e componentes (ui/ = componentes base do design system)
  contexts/    AuthContext
  services/    api.js (único cliente HTTP)
```
Utilitários puros (`cpfValido`, `calcularFatura`) ficam em `backend/src/models/`.

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

# + testes de integração (categorias e fontes-destinos): precisam de um banco de teste exclusivo,
# cujo schema é recriado a cada execução (o nome do banco deve conter "test")
createdb fintrack_test
TEST_DATABASE_URL=postgresql://localhost:5432/fintrack_test npm test
```

## Rotas
Implementadas até agora: `GET /api/health`, `POST /api/auth/cadastro`, `POST /api/auth/login` (limite de tentativas; ajustável por `LOGIN_RATE_LIMIT_MAX`) e `GET /api/auth/me` (requer `Authorization: Bearer <token>`), além do CRUD de `/api/categorias` e de `/api/fontes-destinos` (`GET`/`POST` e `PUT`/`DELETE` em `/:id`, todos autenticados). As demais (lançamentos, relatórios) seguem a tabela 10.5 do enunciado e serão adicionadas.

Regras de fontes e destinos: o nome é único por usuário **e tipo** (uma conta e um cartão podem se chamar "Nubank"). Enquanto o item tiver lançamentos, o `PUT` devolve 409 se mudar o `tipo`, o `dia_fechamento` ou o `dia_vencimento`, para que as faturas (calculadas a partir da data da compra e dos dias atuais do cartão) não mudem retroativamente.

## Design system (front-end)
- Tokens do Figma em `frontend/src/index.css`, com modo claro e escuro (`[data-theme="dark"]`). Use as classes do Tailwind (`bg-surface`, `text-text-muted`, `border-border-strong`...), sem cores soltas.
- Componentes base em `frontend/src/components/ui`: `Button`, `Badge`, `Input`, `Select`, `Segmentado` e `MoneyText`.
- Ícones: Material Icons (Outlined) com `<Icone nome="add" />`, usando o nome do ícone do Figma.
- Foco inicial em `Gaveta` e `Dialogo`: marque o campo com `data-autofocus` (não `autoFocus`). O `autoFocus` do React roda antes de o `<dialog>` abrir e o foco acaba no botão "Fechar".
