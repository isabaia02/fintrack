import 'dotenv/config';
import bcrypt from 'bcrypt';
import pg from 'pg';
import { CUSTO_BCRYPT } from '../src/config/senha.js';
import { SENHA_DEMONSTRACAO, USUARIOS_DEMONSTRACAO, popularDemonstracao } from './demonstracao.js';

if (process.env.NODE_ENV === 'production') {
  console.error('Seed recusado: NODE_ENV=production. Os dados de demonstração substituem os dos usuários de exemplo.');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL não definido no .env');
  process.exit(1);
}

const { hostname, port, pathname } = new URL(process.env.DATABASE_URL);
const emails = USUARIOS_DEMONSTRACAO.map((u) => u.email).join(', ');
console.log(`Banco: ${hostname}${port ? `:${port}` : ''}${pathname} | substituindo os dados de ${emails}`);

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  await client.query('BEGIN');
  await popularDemonstracao(client, await bcrypt.hash(SENHA_DEMONSTRACAO, CUSTO_BCRYPT));
  await client.query('COMMIT');
  console.log(`Seed concluído. Senha dos usuários: ${SENHA_DEMONSTRACAO}`);
} catch (erro) {
  await client.query('ROLLBACK');
  const conflito = erro.code === '23505' && 'outra conta já usa o CPF de um usuário de demonstração; nada foi alterado.';
  console.error('Falha no seed:', conflito || erro.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
