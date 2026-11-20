import pg from 'pg';

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
});

pool.on('error', (erro) => console.error('Erro inesperado no pool do banco:', erro));

// Executa `fn(client)` numa transação: COMMIT se resolver, ROLLBACK se lançar.
// Se o próprio ROLLBACK falhar, a conexão é descartada do pool em vez de devolvida.
export async function emTransacao(fn) {
  const client = await pool.connect();
  let descartarConexao = false;
  try {
    await client.query('BEGIN');
    const resultado = await fn(client);
    await client.query('COMMIT');
    return resultado;
  } catch (erro) {
    try {
      await client.query('ROLLBACK');
    } catch (erroRollback) {
      console.error('Falha no ROLLBACK:', erroRollback);
      descartarConexao = true;
    }
    throw erro;
  } finally {
    client.release(descartarConexao);
  }
}
