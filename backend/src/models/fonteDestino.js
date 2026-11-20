import { emTransacao, pool } from '../config/db.js';

const SELECT_COM_TOTAL = `
  SELECT f.id, f.nome, f.tipo, f.dia_fechamento, f.dia_vencimento,
         f.limite::float8 AS limite, f.reserva, COUNT(l.id)::int AS total_lancamentos
  FROM fontes_destinos f
  LEFT JOIN lancamentos l ON l.fonte_destino_id = f.id AND l.usuario_id = f.usuario_id
  WHERE f.usuario_id = $1`;

const ORDEM = `
  ORDER BY CASE f.tipo WHEN 'renda' THEN 1 WHEN 'conta' THEN 2 ELSE 3 END, LOWER(f.nome)`;

export function nomeDuplicado(erro) {
  return erro.code === '23505' && erro.constraint === 'fontes_destinos_nome_unico';
}

export async function listar(usuarioId, tipo) {
  const params = [usuarioId];
  let filtro = '';
  if (tipo) {
    params.push(tipo);
    filtro = ' AND f.tipo = $2';
  }
  const { rows } = await pool.query(`${SELECT_COM_TOTAL}${filtro} GROUP BY f.id ${ORDEM}`, params);
  return rows;
}

export async function buscar(usuarioId, id, client = pool) {
  const { rows } = await client.query(`${SELECT_COM_TOTAL} AND f.id = $2 GROUP BY f.id`, [usuarioId, id]);
  return rows[0] ?? null;
}

async function contarLancamentos(client, usuarioId, id) {
  const { rows: [{ total }] } = await client.query(
    'SELECT COUNT(*)::int AS total FROM lancamentos WHERE fonte_destino_id = $1 AND usuario_id = $2',
    [id, usuarioId],
  );
  return total;
}

export async function criar(usuarioId, dados) {
  const { rows: [{ id }] } = await pool.query(
    `INSERT INTO fontes_destinos (usuario_id, nome, tipo, dia_fechamento, dia_vencimento, limite, reserva)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [usuarioId, dados.nome, dados.tipo, dados.dia_fechamento, dados.dia_vencimento, dados.limite, dados.reserva],
  );
  return buscar(usuarioId, id);
}

export function atualizar(usuarioId, id, dados) {
  return emTransacao(async (client) => {
    const { rows: [atual] } = await client.query(
      'SELECT id, tipo, dia_fechamento, dia_vencimento FROM fontes_destinos WHERE id = $1 AND usuario_id = $2 FOR UPDATE',
      [id, usuarioId],
    );
    if (!atual) return { naoEncontrada: true };

    // As faturas são calculadas a partir da data da compra e dos dias atuais do cartão:
    // mudar tipo, fechamento ou vencimento reclassificaria os lançamentos antigos.
    const diasMudados = ['dia_fechamento', 'dia_vencimento'].filter((campo) => dados[campo] !== atual[campo]);
    if (dados.tipo !== atual.tipo || diasMudados.length) {
      const total = await contarLancamentos(client, usuarioId, id);
      if (total > 0) {
        if (dados.tipo !== atual.tipo) return { tipoBloqueado: total };
        return { diasBloqueados: { total, campos: diasMudados } };
      }
    }

    await client.query(
      `UPDATE fontes_destinos
       SET nome = $1, tipo = $2, dia_fechamento = $3, dia_vencimento = $4, limite = $5, reserva = $6
       WHERE id = $7 AND usuario_id = $8`,
      [dados.nome, dados.tipo, dados.dia_fechamento, dados.dia_vencimento, dados.limite, dados.reserva, id, usuarioId],
    );
    return { fonteDestino: await buscar(usuarioId, id, client) };
  });
}

export function excluir(usuarioId, id) {
  return emTransacao(async (client) => {
    const { rows: [item] } = await client.query(
      'SELECT id FROM fontes_destinos WHERE id = $1 AND usuario_id = $2 FOR UPDATE',
      [id, usuarioId],
    );
    if (!item) return { naoEncontrada: true };

    const total = await contarLancamentos(client, usuarioId, id);
    if (total > 0) return { bloqueadaPor: total };

    await client.query('DELETE FROM fontes_destinos WHERE id = $1 AND usuario_id = $2', [id, usuarioId]);
    return { removida: true };
  });
}
