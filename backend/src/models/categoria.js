import { pool } from '../config/db.js';

const TOTAL_SLOTS = 8;
const ID_MAX = 2147483647; 

const SELECT_COM_TOTAL = `
  SELECT c.id, c.nome, c.tipo, c.cor, COUNT(l.id)::int AS total_lancamentos
  FROM categorias c
  LEFT JOIN lancamentos l ON l.categoria_id = c.id AND l.usuario_id = c.usuario_id
  WHERE c.usuario_id = $1`;

export function idValido(valor) {
  const id = Number(valor);
  return /^\d+$/.test(String(valor)) && id >= 1 && id <= ID_MAX ? id : null;
}

export function nomeDuplicado(erro) {
  return erro.code === '23505' && erro.constraint === 'categorias_nome_unico';
}

export async function listar(usuarioId, tipo) {
  const params = [usuarioId];
  let filtro = '';
  if (tipo) {
    params.push(tipo);
    filtro = ' AND c.tipo = $2';
  }
  const { rows } = await pool.query(
    `${SELECT_COM_TOTAL}${filtro} GROUP BY c.id ORDER BY c.tipo, LOWER(c.nome)`,
    params,
  );
  return rows;
}

export async function buscar(usuarioId, id, client = pool) {
  const { rows } = await client.query(`${SELECT_COM_TOTAL} AND c.id = $2 GROUP BY c.id`, [usuarioId, id]);
  return rows[0] ?? null;
}

function proximoSlot(usadas) {
  for (let slot = 1; slot <= TOTAL_SLOTS; slot += 1) {
    if (!usadas.has(slot)) return slot;
  }
  return null;
}

async function emTransacao(fn) {
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

export function criar(usuarioId, { nome, tipo }) {
  return emTransacao(async (client) => {
    await client.query('SELECT id FROM usuarios WHERE id = $1 FOR UPDATE', [usuarioId]);
    const { rows: existentes } = await client.query(
      'SELECT cor FROM categorias WHERE usuario_id = $1 AND cor IS NOT NULL',
      [usuarioId],
    );
    const cor = proximoSlot(new Set(existentes.map((c) => c.cor)));
    const { rows: [categoria] } = await client.query(
      `INSERT INTO categorias (usuario_id, nome, tipo, cor) VALUES ($1, $2, $3, $4)
       RETURNING id, nome, tipo, cor, 0 AS total_lancamentos`,
      [usuarioId, nome, tipo, cor],
    );
    return categoria;
  });
}

export function atualizar(usuarioId, id, { nome, tipo }) {
  return emTransacao(async (client) => {
    const { rows: [atual] } = await client.query(
      'SELECT id, tipo FROM categorias WHERE id = $1 AND usuario_id = $2 FOR UPDATE',
      [id, usuarioId],
    );
    if (!atual) return { naoEncontrada: true };

    if (tipo && tipo !== atual.tipo) {
      const { rows: [{ total }] } = await client.query(
        'SELECT COUNT(*)::int AS total FROM lancamentos WHERE categoria_id = $1 AND usuario_id = $2',
        [id, usuarioId],
      );
      if (total > 0) return { tipoBloqueado: total };
    }

    await client.query(
      'UPDATE categorias SET nome = $1, tipo = $2 WHERE id = $3 AND usuario_id = $4',
      [nome, tipo ?? atual.tipo, id, usuarioId],
    );
    return { categoria: await buscar(usuarioId, id, client) };
  });
}

export function excluir(usuarioId, id) {
  return emTransacao(async (client) => {
    const { rows: [categoria] } = await client.query(
      'SELECT id FROM categorias WHERE id = $1 AND usuario_id = $2 FOR UPDATE',
      [id, usuarioId],
    );
    if (!categoria) return { naoEncontrada: true };

    const { rows: [{ total }] } = await client.query(
      'SELECT COUNT(*)::int AS total FROM lancamentos WHERE categoria_id = $1 AND usuario_id = $2',
      [id, usuarioId],
    );
    if (total > 0) return { bloqueadaPor: total };

    await client.query('DELETE FROM categorias WHERE id = $1 AND usuario_id = $2', [id, usuarioId]);
    return { removida: true };
  });
}
