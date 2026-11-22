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
