import { pool } from '../config/db.js';
import { periodoAnterior } from '../utils/periodo.js';

const arredondar = (valor, casas) => Math.round(valor * 10 ** casas) / 10 ** casas;
const somar = (itens, campo) => arredondar(itens.reduce((soma, item) => soma + item[campo], 0), 2);

function variacao(atual, anterior) {
  if (anterior === 0) return atual === 0 ? 0 : null;
  return arredondar(((atual - anterior) / anterior) * 100, 1);
}

function resumir(categorias) {
  const total = somar(categorias, 'total');
  const totalAnterior = somar(categorias, 'totalAnterior');
  return {
    total,
    totalAnterior,
    variacaoPercentual: variacao(total, totalAnterior),
    categorias: categorias.map(({ tipo, ...categoria }) => ({
      ...categoria,
      percentual: total ? arredondar((categoria.total / total) * 100, 2) : 0,
      variacaoPercentual: variacao(categoria.total, categoria.totalAnterior),
    })),
  };
}

export async function porCategoria(usuarioId, periodo) {
  const anterior = periodoAnterior(periodo.inicio, periodo.fim);
  const { rows } = await pool.query(
    `SELECT c.id, c.nome, c.cor, c.tipo,
            COALESCE(SUM(l.valor) FILTER (WHERE l.data >= $2), 0)::float8 AS total,
            COALESCE(SUM(l.valor) FILTER (WHERE l.data < $2), 0)::float8 AS "totalAnterior"
     FROM lancamentos l
     JOIN categorias c ON c.id = l.categoria_id
     WHERE l.usuario_id = $1 AND l.data BETWEEN $3 AND $4
     GROUP BY c.id
     ORDER BY total DESC, "totalAnterior" DESC, c.nome`,
    [usuarioId, periodo.inicio, anterior.inicio, periodo.fim],
  );

  return {
    periodo,
    periodoAnterior: anterior,
    saidas: resumir(rows.filter((c) => c.tipo === 'saida')),
    entradas: resumir(rows.filter((c) => c.tipo === 'entrada')),
  };
}

const porTotal = (a, b) => b.total - a.total;

function totaisPor(linhas, campo) {
  return linhas
    .filter((linha) => linha[campo] > 0)
    .map((linha) => ({ id: linha.id, nome: linha.nome, tipo: linha.tipo, total: linha[campo] }))
    .sort(porTotal);
}

export async function porFonteDestino(usuarioId, periodo) {
  const { rows } = await pool.query(
    `SELECT f.id, f.nome, f.tipo, f.reserva,
            COALESCE(SUM(l.valor) FILTER (WHERE l.tipo = 'entrada'), 0)::float8 AS entradas,
            COALESCE(SUM(l.valor) FILTER (WHERE l.tipo = 'saida'), 0)::float8 AS saidas,
            COALESCE(SUM(CASE WHEN l.tipo = 'entrada' THEN l.valor ELSE -l.valor END), 0)::float8 AS saldo
     FROM fontes_destinos f
     LEFT JOIN lancamentos l
       ON l.fonte_destino_id = f.id AND l.usuario_id = f.usuario_id AND l.data BETWEEN $2 AND $3
     WHERE f.usuario_id = $1
     GROUP BY f.id
     ORDER BY LOWER(f.nome)`,
    [usuarioId, periodo.inicio, periodo.fim],
  );

  const fontes = totaisPor(rows, 'entradas');
  const destinos = totaisPor(rows, 'saidas');
  const contas = rows.filter((linha) => linha.tipo === 'conta').map(({ tipo, ...conta }) => conta);

  return {
    periodo,
    entradas: { total: somar(fontes, 'total'), fontes },
    saidas: { total: somar(destinos, 'total'), destinos },
    contas,
    saldoContas: somar(contas, 'saldo'),
  };
}
