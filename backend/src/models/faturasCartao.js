import { pool } from '../config/db.js';
import { calcularFatura } from './faturas.js';
import { somarMeses } from './parcelamento.js';

const paraCentavos = (valor) => Math.round(valor * 100);
const paraReais = (centavos) => centavos / 100;

const referenciaMmAaaa = (referencia) => `${referencia.slice(5, 7)}/${referencia.slice(0, 4)}`;

export function montarFaturas({ cartoes, lancamentos, hoje, meses }) {
  return cartoes.map((cartao) => {
    const regra = { diaFechamento: cartao.dia_fechamento, diaVencimento: cartao.dia_vencimento };
    const faturas = new Map();
    for (let i = 0; i <= meses; i += 1) {
      const fatura = calcularFatura(hoje, regra, i + 1);
      faturas.set(fatura.referencia, { ...fatura, aberta: i === 0, itens: [], centavos: 0 });
    }

    let utilizado = 0;
    for (const l of lancamentos.filter((x) => x.fonte_destino_id === cartao.id)) {
      const { referencia, vencimento } = calcularFatura(l.data, regra, 1);
      if (vencimento >= hoje) utilizado += paraCentavos(l.valor);

      const fatura = faturas.get(referencia);
      if (!fatura) continue;
      fatura.itens.push({
        id: l.id,
        descricao: l.descricao,
        data: l.data,
        valor: l.valor,
        parcela_atual: l.parcela_atual,
        total_parcelas: l.total_parcelas,
      });
      fatura.centavos += paraCentavos(l.valor);
    }

    const limiteCentavos = paraCentavos(cartao.limite);
    return {
      id: cartao.id,
      nome: cartao.nome,
      dia_fechamento: cartao.dia_fechamento,
      dia_vencimento: cartao.dia_vencimento,
      limite: cartao.limite,
      limite_utilizado: paraReais(utilizado),
      limite_disponivel: paraReais(limiteCentavos - utilizado),
      faturas: [...faturas.values()].map(({ centavos, referencia, itens, ...resto }) => ({
        referencia: referenciaMmAaaa(referencia),
        fechamento: resto.fechamento,
        vencimento: resto.vencimento,
        aberta: resto.aberta,
        itens: itens.sort((a, b) => a.data.localeCompare(b.data) || a.id - b.id),
        total: paraReais(centavos),
      })),
    };
  });
}

export async function buscarFaturas(usuarioId, { meses, hoje }) {
  const { rows: cartoes } = await pool.query(
    `SELECT id, nome, dia_fechamento, dia_vencimento, limite::float8 AS limite
     FROM fontes_destinos
     WHERE usuario_id = $1 AND tipo = 'cartao_credito'
     ORDER BY LOWER(nome)`,
    [usuarioId],
  );
  if (cartoes.length === 0) return [];

  const { rows: lancamentos } = await pool.query(
    `SELECT id, fonte_destino_id, descricao, TO_CHAR(data, 'YYYY-MM-DD') AS data,
            valor::float8 AS valor, parcela_atual, total_parcelas
     FROM lancamentos
     WHERE usuario_id = $1 AND tipo = 'saida' AND fonte_destino_id = ANY($2::int[]) AND data >= $3
     ORDER BY data, id`,
    [usuarioId, cartoes.map((c) => c.id), somarMeses(hoje, -3)],
  );

  return montarFaturas({ cartoes, lancamentos, hoje, meses });
}
