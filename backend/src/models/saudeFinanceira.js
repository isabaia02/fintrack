import { pool } from '../config/db.js';
import { buscarFaturas } from './faturasCartao.js';
import { calcularIndicadores, LIMITES } from './indicadores.js';
import { projetarSaldo } from './projecaoSaldo.js';
import { gerarDicasPorRegras } from './dicas.js';
import { dicasDaIaOuVazio, resumirParaIa } from '../services/iaDicas.js';
import { somarMesesRef } from '../utils/formato.js';

export const AVISO_EDUCATIVO = 'Informações educativas, não constituem recomendação financeira profissional.';

export function montarSaudeFinanceira({ hoje, lancamentos, saldoInicial, reserva, cartoes }) {
  const { indicadores, contexto } = calcularIndicadores({ hoje, lancamentos, reserva, cartoes });
  const projecao = projetarSaldo({ hoje, lancamentos, saldoInicial });
  const dicasRegras = gerarDicasPorRegras({ indicadores, contexto, projecao });
  return { referencia: hoje.slice(0, 7), indicadores, projecao, dicasRegras };
}

export async function carregarDados(usuarioId, hoje) {
  const inicio = `${somarMesesRef(hoje.slice(0, 7), -3)}-01`;
  const [lancamentos, saldo, reserva, cartoes] = await Promise.all([
    pool.query(
      `SELECT l.tipo, l.valor::float8 AS valor, TO_CHAR(l.data, 'YYYY-MM-DD') AS data,
              l.total_parcelas, c.nome AS categoria
       FROM lancamentos l JOIN categorias c ON c.id = l.categoria_id
       WHERE l.usuario_id = $1 AND l.data >= $2`,
      [usuarioId, inicio],
    ),
    pool.query(
      `SELECT COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE -valor END), 0)::float8 AS saldo
       FROM lancamentos WHERE usuario_id = $1 AND data <= $2`,
      [usuarioId, hoje],
    ),
    pool.query(
      `SELECT COUNT(DISTINCT f.id)::int AS contas,
              COALESCE(SUM(CASE WHEN l.tipo = 'entrada' THEN l.valor ELSE -l.valor END), 0)::float8 AS saldo
       FROM fontes_destinos f
       LEFT JOIN lancamentos l ON l.fonte_destino_id = f.id AND l.data <= $2
       WHERE f.usuario_id = $1 AND f.reserva`,
      [usuarioId, hoje],
    ),
    buscarFaturas(usuarioId, { meses: LIMITES.cartoesMeses - 1, hoje }),
  ]);
  return {
    hoje,
    lancamentos: lancamentos.rows,
    saldoInicial: saldo.rows[0].saldo,
    reserva: { temConta: reserva.rows[0].contas > 0, saldo: reserva.rows[0].saldo },
    cartoes,
  };
}

export async function buscarSaudeFinanceira(usuarioId, { hoje, gerarDicasIa } = {}) {
  const dados = await carregarDados(usuarioId, hoje);
  const { dicasRegras, ...resto } = montarSaudeFinanceira(dados);
  const extras = await dicasDaIaOuVazio(resumirParaIa(resto.indicadores, resto.projecao), gerarDicasIa);
  return {
    referencia: resto.referencia,
    aviso: AVISO_EDUCATIVO,
    indicadores: resto.indicadores,
    projecao: resto.projecao,
    dicas: [...dicasRegras, ...extras],
  };
}
