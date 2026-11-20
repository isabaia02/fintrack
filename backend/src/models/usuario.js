import { emTransacao, pool } from '../config/db.js';
import { categoriasPadrao, fontesDestinosPadrao } from './padroes.js';

const CAMPOS_PUBLICOS = 'id, nome, email';

export function criarComPadroes({ nome, email, cpf, senhaHash }) {
  return emTransacao(async (client) => {
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
    return usuario;
  });
}

export function campoDuplicado(erro) {
  if (erro.code !== '23505') return null;
  if (erro.constraint?.includes('cpf')) return 'cpf';
  if (erro.constraint?.includes('email')) return 'email';
  return null;
}

export async function buscarPorEmail(email) {
  const { rows } = await pool.query(
    `SELECT ${CAMPOS_PUBLICOS}, senha_hash FROM usuarios WHERE email = $1`,
    [email],
  );
  return rows[0] ?? null;
}

export async function buscarPorId(id) {
  const { rows } = await pool.query(
    `SELECT ${CAMPOS_PUBLICOS} FROM usuarios WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}
