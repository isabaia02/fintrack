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
    middlewares/   autenticar.js (JWT), erros.js
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

## Rotas
Implementadas até agora: `GET /api/health`. As demais (auth, categorias, fontes-destinos, lançamentos, relatórios) seguem a tabela 10.5 do enunciado e serão adicionadas.

## Design system (front-end)
- Tokens do Figma em `frontend/src/index.css`, com modo claro e escuro (`[data-theme="dark"]`). Use as classes do Tailwind (`bg-surface`, `text-text-muted`, `border-border-strong`...), sem cores soltas.
- Componentes base em `frontend/src/components/ui`: `Button`, `Badge`, `Input`, `Select`, `Segmentado` e `MoneyText`.
- Ícones: Material Icons (Outlined) com `<Icone nome="add" />`, usando o nome do ícone do Figma.
