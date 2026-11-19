import { pool } from '../config/db.js';
import { categoriasPadrao, fontesDestinosPadrao } from './padroes.js';

const CAMPOS_PUBLICOS = 'id, nome, email';

export async function criarComPadroes({ nome, email, cpf, senhaHash }) {
  const client = await pool.connect();
  let descartarConexao = false;
  try {
    await client.query('BEGIN');
    const { rows: [usuario] } = await client.query(
      `INSERT INTO usuarios (nome, email, cpf, senha_hash) VALUES ($1, $2, $3, $4)
       RETURNING ${CAMPOS_PUBLICOS}`,
      [nome, email, cpf, senhaHash],
    );
    for (const c of categoriasPadrao) {
      await client.query(
        'INSERT INTO categorias (usuario_id, nome, tipo, cor) VALUES ($1, $2, $3, $4)',
        [usuario.id, c.nome, c.tipo, c.cor],
      );
    }
    for (const f of fontesDestinosPadrao) {
      await client.query(
        'INSERT INTO fontes_destinos (usuario_id, nome, tipo) VALUES ($1, $2, $3)',
        [usuario.id, f.nome, f.tipo],
      );
    }
    await client.query('COMMIT');
    return usuario;
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

export function campoDuplicado(erro) {
  if (erro.code !== '23505') return null;
  if (erro.constraint?.includes('cpf')) return 'cpf';
  if (erro.constraint?.includes('email')) return 'email';
  return null;
}
