import { randomUUID } from 'node:crypto';
import { emTransacao, pool } from '../config/db.js';
import { idValido } from '../utils/id.js';
import { dividirEmParcelas, somarMeses } from './parcelamento.js';

export { idValido };

const TAMANHO_PAGINA = 20;

const NOME_TIPO = { entrada: 'entrada', saida: 'saída' };

const SELECT_LANCAMENTO = `
  SELECT l.id, l.tipo, l.descricao, l.valor::float8 AS valor, TO_CHAR(l.data, 'YYYY-MM-DD') AS data,
         l.parcela_atual, l.total_parcelas, l.grupo_parcelamento,
         json_build_object('id', c.id, 'nome', c.nome, 'cor', c.cor) AS categoria,
         json_build_object('id', f.id, 'nome', f.nome, 'tipo', f.tipo) AS "fonteDestino"
  FROM lancamentos l
  JOIN categorias c ON c.id = l.categoria_id
  JOIN fontes_destinos f ON f.id = l.fonte_destino_id
  WHERE l.usuario_id = $1`;

export async function buscar(usuarioId, id, client = pool) {
  const { rows } = await client.query(`${SELECT_LANCAMENTO} AND l.id = $2`, [usuarioId, id]);
  return rows[0] ?? null;
}

function condicoesDoFiltro(usuarioId, { inicio, fim, tipo, categoriaId, fonteDestinoId }) {
  const params = [usuarioId, inicio, fim];
  const condicoes = ['l.data BETWEEN $2 AND $3'];
  const adicionar = (coluna, valor) => {
    if (valor === null || valor === undefined) return;
    params.push(valor);
    condicoes.push(`${coluna} = $${params.length}`);
  };
  adicionar('l.tipo', tipo);
  adicionar('l.categoria_id', categoriaId);
  adicionar('l.fonte_destino_id', fonteDestinoId);
  return { params, where: condicoes.map((c) => ` AND ${c}`).join('') };
}

export async function listar(usuarioId, filtros) {
  const { params, where } = condicoesDoFiltro(usuarioId, filtros);
  const deslocamento = (filtros.pagina - 1) * TAMANHO_PAGINA;

  const [{ rows: itens }, { rows: [resumo] }] = await Promise.all([
    pool.query(
      `${SELECT_LANCAMENTO}${where}
       ORDER BY l.data DESC, l.id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, TAMANHO_PAGINA, deslocamento],
    ),
    pool.query(
      `SELECT COUNT(*)::int AS total,
              COALESCE(SUM(l.valor) FILTER (WHERE l.tipo = 'entrada'), 0)::float8 AS entradas,
              COALESCE(SUM(l.valor) FILTER (WHERE l.tipo = 'saida'), 0)::float8 AS saidas,
              COALESCE(SUM(CASE WHEN l.tipo = 'entrada' THEN l.valor ELSE -l.valor END), 0)::float8 AS saldo
       FROM lancamentos l
       WHERE l.usuario_id = $1${where}`,
      params,
    ),
  ]);

  return {
    itens,
    total: resumo.total,
    pagina: filtros.pagina,
    totalPaginas: Math.ceil(resumo.total / TAMANHO_PAGINA),
    totais: { entradas: resumo.entradas, saidas: resumo.saidas, saldo: resumo.saldo },
  };
}

async function buscarVarios(client, usuarioId, ids) {
  const { rows } = await client.query(
    `${SELECT_LANCAMENTO} AND l.id = ANY($2::int[]) ORDER BY l.parcela_atual`,
    [usuarioId, ids],
  );
  return rows;
}

async function conferirReferencias(client, usuarioId, dados, campos, totalParcelas) {
  if (!campos.categoriaId) {
    const { rows: [categoria] } = await client.query(
      'SELECT tipo FROM categorias WHERE id = $1 AND usuario_id = $2 FOR SHARE',
      [dados.categoriaId, usuarioId],
    );
    if (!categoria) {
      campos.categoriaId = 'Categoria não encontrada.';
    } else if (!campos.tipo && categoria.tipo !== dados.tipo) {
      campos.categoriaId = `A categoria informada é de ${NOME_TIPO[categoria.tipo]}, mas o lançamento é de ${NOME_TIPO[dados.tipo]}.`;
    }
  }

  if (!campos.fonteDestinoId) {
    const { rows: [fonteDestino] } = await client.query(
      'SELECT tipo FROM fontes_destinos WHERE id = $1 AND usuario_id = $2 FOR SHARE',
      [dados.fonteDestinoId, usuarioId],
    );
    if (!fonteDestino) {
      campos.fonteDestinoId = 'Fonte ou destino não encontrado.';
    } else if (!campos.parcelas && totalParcelas > 1 && fonteDestino.tipo !== 'cartao_credito') {
      campos.parcelas = 'O parcelamento só está disponível para cartão de crédito.';
    }
  }
}

const temErros = (campos) => Object.keys(campos).length > 0;

export function criar(usuarioId, dados, errosDeEntrada = {}) {
  return emTransacao(async (client) => {
    const campos = { ...errosDeEntrada };
    const totalParcelas = dados.parcelas ?? 1;
    await conferirReferencias(client, usuarioId, dados, campos, totalParcelas);

    const valores = campos.valor ? [] : dividirEmParcelas(dados.valor, totalParcelas);
    if (!campos.parcelas && valores.some((v) => v <= 0)) {
      campos.parcelas = `O valor é baixo demais para dividir em ${totalParcelas} parcelas.`;
    }
    if (temErros(campos)) return { invalido: campos };

    const grupo = totalParcelas > 1 ? randomUUID() : null;
    const ids = [];
    for (let k = 1; k <= totalParcelas; k += 1) {
      const { rows: [{ id }] } = await client.query(
        `INSERT INTO lancamentos (usuario_id, tipo, descricao, valor, data, categoria_id, fonte_destino_id,
                                  parcela_atual, total_parcelas, grupo_parcelamento)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
        [usuarioId, dados.tipo, dados.descricao, valores[k - 1], somarMeses(dados.data, k - 1),
          dados.categoriaId, dados.fonteDestinoId, k, totalParcelas, grupo],
      );
      ids.push(id);
    }
    return { lancamentos: await buscarVarios(client, usuarioId, ids) };
  });
}

export function atualizar(usuarioId, id, dados, errosDeEntrada = {}) {
  return emTransacao(async (client) => {
    const { rows: [atual] } = await client.query(
      'SELECT id, total_parcelas FROM lancamentos WHERE id = $1 AND usuario_id = $2 FOR UPDATE',
      [id, usuarioId],
    );
    if (!atual) return { naoEncontrado: true };

    const campos = { ...errosDeEntrada };
    if (!campos.parcelas && dados.parcelas !== null && dados.parcelas !== atual.total_parcelas) {
      campos.parcelas = 'Não é possível alterar o número de parcelas de um lançamento já cadastrado.';
    }
    await conferirReferencias(client, usuarioId, dados, campos, atual.total_parcelas);
    if (temErros(campos)) return { invalido: campos };

    await client.query(
      `UPDATE lancamentos
       SET tipo = $1, descricao = $2, valor = $3, data = $4, categoria_id = $5, fonte_destino_id = $6
       WHERE id = $7 AND usuario_id = $8`,
      [dados.tipo, dados.descricao, dados.valor, dados.data, dados.categoriaId, dados.fonteDestinoId, id, usuarioId],
    );
    return { lancamento: await buscar(usuarioId, id, client) };
  });
}

export function excluir(usuarioId, id, todasParcelas) {
  return emTransacao(async (client) => {
    const { rows: [lancamento] } = await client.query(
      'SELECT id, grupo_parcelamento FROM lancamentos WHERE id = $1 AND usuario_id = $2 FOR UPDATE',
      [id, usuarioId],
    );
    if (!lancamento) return { naoEncontrado: true };

    if (todasParcelas && lancamento.grupo_parcelamento) {
      await client.query(
        'DELETE FROM lancamentos WHERE grupo_parcelamento = $1 AND usuario_id = $2',
        [lancamento.grupo_parcelamento, usuarioId],
      );
    } else {
      await client.query('DELETE FROM lancamentos WHERE id = $1 AND usuario_id = $2', [id, usuarioId]);
    }
    return { removido: true };
  });
}
