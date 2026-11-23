import 'dotenv/config';
import bcrypt from 'bcrypt';
import pg from 'pg';
import { CUSTO_BCRYPT } from '../src/config/senha.js';
import { SENHA_DEMONSTRACAO, USUARIOS_DEMONSTRACAO, popularDemonstracao } from './demonstracao.js';

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  await client.query('BEGIN');
  await popularDemonstracao(client, await bcrypt.hash(SENHA_DEMONSTRACAO, CUSTO_BCRYPT));
  await client.query('COMMIT');
  const emails = USUARIOS_DEMONSTRACAO.map((u) => u.email).join(', ');
  console.log(`Seed concluído. Usuários: ${emails} | senha: ${SENHA_DEMONSTRACAO}`);
} catch (erro) {
  await client.query('ROLLBACK');
  console.error('Falha no seed:', erro.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
