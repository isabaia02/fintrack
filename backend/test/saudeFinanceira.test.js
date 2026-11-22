import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { calcularIndicadores, ehNecessidade } from '../src/models/indicadores.js';
import { projetarSaldo } from '../src/models/projecaoSaldo.js';
import { gerarDicasPorRegras } from '../src/models/dicas.js';
import { montarSaudeFinanceira } from '../src/models/saudeFinanceira.js';
import { dicasDaIaOuVazio, gerarDicasIa, lerDicas, resumirParaIa } from '../src/services/iaDicas.js';
import { formatarMoeda } from '../src/utils/formato.js';

const HOJE = '2026-11-20';
const SEM_RESERVA = { temConta: false, saldo: 0 };

const entrada = (data, valor, categoria = 'Salário') => ({ tipo: 'entrada', valor, data, categoria, total_parcelas: 1 });
const saida = (data, valor, categoria = 'Outros', total_parcelas = 1) => ({ tipo: 'saida', valor, data, categoria, total_parcelas });
const cartao = (extra = {}) => ({
  id: 1, nome: 'Visa crédito', limite: 5000, limite_utilizado: 0,
  faturas: [{ total: 0 }, { total: 0 }, { total: 0 }, { total: 0 }], ...extra,
});

function indicadores(lancamentos, extra = {}) {
  const { indicadores: lista, contexto } = calcularIndicadores({
    hoje: HOJE, lancamentos, reserva: SEM_RESERVA, cartoes: [], ...extra,
  });
  return { por: Object.fromEntries(lista.map((i) => [i.id, i])), lista, contexto };
}

describe('formato dos indicadores', () => {
  test('devolve os 6 indicadores, cada um com id, titulo, valor, status e mensagem', () => {
    const { lista } = indicadores([entrada('2026-11-05', 5000), saida('2026-11-10', 1000)]);
    assert.deepEqual(lista.map((i) => i.id), [
      'taxa_poupanca', 'comprometimento_cartoes', 'reserva_emergencia',
      'parcelas_futuras', 'regra_50_30_20', 'categoria_fora_da_curva',
    ]);
    for (const i of lista) {
      assert.ok(['bom', 'atencao', 'alerta', 'info'].includes(i.status), `${i.id}: status ${i.status}`);
      assert.equal(typeof i.titulo, 'string');
      assert.ok(i.mensagem.length > 10);
      assert.ok('valor' in i);
    }
  });
});

describe('taxa de poupança', () => {
  test('4% da renda: alerta, com a mensagem do enunciado', () => {
    const { por } = indicadores([entrada('2026-11-05', 5000), saida('2026-11-10', 4800)]);
    assert.equal(por.taxa_poupanca.valor, 4);
    assert.equal(por.taxa_poupanca.status, 'alerta');
    assert.equal(
      por.taxa_poupanca.mensagem,
      'Você guardou 4% da sua renda em novembro. Uma meta comum é guardar pelo menos 10%.',
    );
  });

  test('de 5% a 10% é atenção e a partir de 10% é bom', () => {
    assert.equal(indicadores([entrada('2026-11-05', 1000), saida('2026-11-10', 920)]).por.taxa_poupanca.status, 'atencao');
    assert.equal(indicadores([entrada('2026-11-05', 1000), saida('2026-11-10', 900)]).por.taxa_poupanca.status, 'bom');
  });

  test('gastar mais do que recebeu é alerta e diz quanto', () => {
    const { taxa_poupanca: t } = indicadores([entrada('2026-11-05', 1000), saida('2026-11-10', 1300)]).por;
    assert.equal(t.status, 'alerta');
    assert.equal(t.valor, -30);
    assert.match(t.mensagem, /R\$ 300,00 a mais/);
  });

  test('sem entradas no mês: info, sem dividir por zero', () => {
    const { taxa_poupanca: t } = indicadores([saida('2026-11-10', 100)]).por;
    assert.equal(t.status, 'info');
    assert.equal(t.valor, null);
  });

  test('só conta o mês corrente (outubro e dezembro ficam de fora)', () => {
    const { taxa_poupanca: t } = indicadores([
      entrada('2026-11-05', 1000), saida('2026-10-10', 900), saida('2026-12-10', 900),
    ]).por;
    assert.equal(t.valor, 100);
  });
});

describe('comprometimento com cartões', () => {
  const faturas = (...totais) => totais.map((total) => ({ total }));

  test('soma as faturas dos próximos 3 meses e divide pela renda', () => {
    const { por } = indicadores([entrada('2026-11-05', 5000)], {
      cartoes: [cartao({ faturas: faturas(1000, 1000, 1100, 9999) })],
    });
    assert.equal(por.comprometimento_cartoes.valor, 62);
    assert.equal(por.comprometimento_cartoes.status, 'atencao');
    assert.match(por.comprometimento_cartoes.mensagem, /comprometem 62% da sua renda/);
  });

  test('soma vários cartões e classifica: até 30% bom, acima de 70% alerta', () => {
    const renda = [entrada('2026-11-05', 1000)];
    const com = (total) => indicadores(renda, { cartoes: [cartao({ faturas: faturas(total) })] }).por.comprometimento_cartoes;
    assert.equal(com(300).status, 'bom');
    assert.equal(com(301).status, 'atencao');
    assert.equal(com(701).status, 'alerta');
    const dois = indicadores(renda, { cartoes: [cartao({ faturas: faturas(200) }), cartao({ id: 2, faturas: faturas(200) })] });
    assert.equal(dois.por.comprometimento_cartoes.valor, 40);
  });

  test('sem cartão ou sem renda: info', () => {
    assert.equal(indicadores([entrada('2026-11-05', 1000)]).por.comprometimento_cartoes.status, 'info');
    assert.equal(indicadores([], { cartoes: [cartao()] }).por.comprometimento_cartoes.valor, null);
  });
});

describe('reserva de emergência', () => {
  const despesas = [saida('2026-08-10', 1000), saida('2026-09-10', 1000), saida('2026-10-10', 1000)];
  const reserva = (saldo) => indicadores(despesas, { reserva: { temConta: true, saldo } }).por.reserva_emergencia;

  test('meses cobertos = saldo da reserva ÷ despesa média dos 3 meses fechados', () => {
    assert.equal(reserva(1800).valor, 1.8);
    assert.equal(reserva(1800).status, 'alerta');
    assert.equal(reserva(1800).mensagem, 'Sua reserva cobre 1,8 meses de despesas. Uma referência comum é de 3 a 6 meses.');
  });

  test('limites: >= 3 bom, >= 2 atenção, abaixo disso alerta', () => {
    assert.equal(reserva(3000).status, 'bom');
    assert.equal(reserva(2000).status, 'atencao');
    assert.equal(reserva(1999).status, 'alerta');
  });

  test('reserva negativa não vira meses negativos', () => {
    assert.equal(reserva(-500).valor, 0);
  });

  test('sem conta marcada como reserva: info, explicando o que fazer', () => {
    const r = indicadores(despesas).por.reserva_emergencia;
    assert.equal(r.status, 'info');
    assert.match(r.mensagem, /marcou nenhuma conta como reserva/);
  });

  test('a média ignora meses sem movimento (quem começou há 1 mês não é diluído)', () => {
    const r = indicadores([saida('2026-10-10', 1000)], { reserva: { temConta: true, saldo: 3000 } }).por.reserva_emergencia;
    assert.equal(r.valor, 3);
  });
});

describe('parcelas futuras', () => {
  test('soma as parcelas dos meses seguintes e diz até quando vão', () => {
    const { parcelas_futuras: p } = indicadores([
      saida('2026-11-10', 300, 'Lazer', 4),
      saida('2026-12-10', 300, 'Lazer', 4),
      saida('2027-02-10', 340, 'Lazer', 4),
      saida('2027-03-10', 300, 'Lazer', 4),
      saida('2027-01-10', 500), // à vista: não é parcela
    ]).por;
    assert.equal(p.valor, 940);
    assert.equal(p.status, 'info');
    assert.equal(p.mensagem, 'Você tem R$ 940,00 em parcelas até março de 2027.');
  });

  test('sem parcelas: valor 0', () => {
    assert.equal(indicadores([]).por.parcelas_futuras.valor, 0);
  });
});

describe('regra 50/30/20', () => {
  test('70/26/4 (exemplo do design): necessidades e poupança fora da meta = alerta', () => {
    const { regra_50_30_20: r } = indicadores([
      entrada('2026-11-05', 10000),
      saida('2026-11-06', 7000, 'Moradia'),
      saida('2026-11-07', 2600, 'Lazer'),
    ]).por;
    assert.deepEqual(r.valor, { necessidades: 70, desejos: 26, poupanca: 4 });
    assert.equal(r.status, 'alerta');
    assert.equal(r.mensagem, 'Necessidades 70%, desejos 26% e poupança 4%. A referência é 50/30/20.');
  });

  test('dentro da meta é bom; uma só fora é atenção', () => {
    const base = [entrada('2026-11-05', 1000)];
    assert.equal(indicadores([...base, saida('2026-11-06', 500, 'Moradia'), saida('2026-11-07', 300, 'Lazer')]).por.regra_50_30_20.status, 'bom');
    // só os desejos passam de 30% (necessidades 40%, desejos 31%, poupança 29%)
    assert.equal(indicadores([...base, saida('2026-11-06', 400, 'Moradia'), saida('2026-11-07', 310, 'Lazer')]).por.regra_50_30_20.status, 'atencao');
  });

  test('gastar mais que a renda: poupança 0% e sem número negativo', () => {
    const { regra_50_30_20: r } = indicadores([entrada('2026-11-05', 1000), saida('2026-11-06', 1500, 'Moradia')]).por;
    assert.equal(r.valor.poupanca, 0);
  });

  test('categoria sem acento/caixa e categorias novas: só necessidades conhecidas contam como tal', () => {
    assert.equal(ehNecessidade('ALIMENTAÇÃO'), true);
    assert.equal(ehNecessidade('Saúde'), true);
    assert.equal(ehNecessidade('Viagens'), false);
  });
});

describe('categoria fora da curva', () => {
  const base = [entrada('2026-11-05', 5000), saida('2026-10-10', 1000, 'Alimentação'), saida('2026-10-11', 500, 'Lazer')];

  test('maior alta sobre o mês anterior: atenção entre 10% e 30%', () => {
    const { categoria_fora_da_curva: c } = indicadores([...base, saida('2026-11-10', 1127, 'Alimentação'), saida('2026-11-11', 500, 'Lazer')]).por;
    assert.equal(c.valor, 12.7);
    assert.equal(c.status, 'atencao');
    assert.equal(c.mensagem, 'Gastos com alimentação subiram 12,7% em relação ao mês anterior.');
  });

  test('30% ou mais é alerta; menos de 10% é bom', () => {
    assert.equal(indicadores([...base, saida('2026-11-10', 1300, 'Alimentação')]).por.categoria_fora_da_curva.status, 'alerta');
    assert.equal(indicadores([...base, saida('2026-11-10', 1050, 'Alimentação')]).por.categoria_fora_da_curva.status, 'bom');
  });

  test('categoria com gasto pequeno no mês anterior não gera alarme', () => {
    const { categoria_fora_da_curva: c } = indicadores([saida('2026-10-10', 10, 'Lazer'), saida('2026-11-10', 100, 'Lazer')]).por;
    assert.equal(c.status, 'info');
  });
});

describe('projeção de saldo', () => {
  test('devolve 6 meses a partir do corrente e aplica renda, gasto médio e parcelas registradas', () => {
    const lancamentos = [
      entrada('2026-08-05', 3000), entrada('2026-09-05', 3000), entrada('2026-10-05', 3000),
      saida('2026-08-10', 1000), saida('2026-09-10', 1000), saida('2026-10-10', 1000),
      saida('2026-12-10', 500, 'Lazer', 3), saida('2027-01-10', 500, 'Lazer', 3),
    ];
    const p = projetarSaldo({ hoje: '2026-11-30', lancamentos, saldoInicial: 1000 });
    assert.deepEqual(p.serie.map((x) => x.mes), ['2026-11', '2026-12', '2027-01', '2027-02', '2027-03', '2027-04']);
    // hoje é o último dia de novembro: nada resta do mês, então nov = saldo inicial
    assert.deepEqual(p.serie.map((x) => x.saldo), [1000, 2500, 4000, 6000, 8000, 10000]);
    assert.equal(p.fica_negativo, false);
    assert.equal(p.primeiro_mes_negativo, null);
  });

  test('no mês corrente só entra a fração de dias que falta e as parcelas depois de hoje', () => {
    const lancamentos = [
      entrada('2026-10-05', 3000), saida('2026-10-10', 1000),
      saida('2026-11-10', 700, 'Lazer', 2), // já passou (saldo inicial já contém)
      saida('2026-11-25', 100, 'Lazer', 2), // ainda vai acontecer
    ];
    // 10 dias restantes de 30 => (3000 - 1000) / 3 = 666,67 e -100 de parcela
    const p = projetarSaldo({ hoje: '2026-11-20', lancamentos, saldoInicial: 0 });
    assert.equal(p.serie[0].saldo, 566.67);
  });

  test('sinaliza o primeiro mês em que o saldo fica negativo', () => {
    const lancamentos = [entrada('2026-10-05', 1000), saida('2026-10-10', 2000)];
    const p = projetarSaldo({ hoje: '2026-11-30', lancamentos, saldoInicial: 500 });
    assert.equal(p.fica_negativo, true);
    assert.equal(p.primeiro_mes_negativo, '2026-12');
    assert.match(p.mensagem, /negativo em dezembro/);
  });
});

describe('dicas por regras', () => {
  const montar = (lancamentos, extra = {}) => {
    const dados = { hoje: HOJE, lancamentos, saldoInicial: 0, reserva: SEM_RESERVA, cartoes: [], ...extra };
    return montarSaudeFinanceira(dados).dicasRegras;
  };

  test('poupança baixa gera a dica de separar 10% do salário', () => {
    const dicas = montar([entrada('2026-11-05', 5000), saida('2026-11-10', 4800)]);
    assert.ok(dicas.some((d) => d.id === 'poupanca' && d.texto.includes(formatarMoeda(500))));
    assert.ok(dicas.every((d) => d.origem === 'regras'));
  });

  test('cartão com uso alto do limite gera a dica com o nome do cartão', () => {
    const dicas = montar([entrada('2026-11-05', 5000)], { cartoes: [cartao({ limite_utilizado: 3750 })] });
    const dica = dicas.find((d) => d.id === 'limite_cartao');
    assert.equal(dica.texto, 'Evite novas parcelas no Visa crédito: ele já usa 75% do limite.');
  });

  test('categoria fora da curva e saldo negativo geram dicas próprias', () => {
    const dicas = montar([
      entrada('2026-10-05', 1000), saida('2026-10-10', 1000, 'Alimentação'),
      entrada('2026-11-05', 1000), saida('2026-11-10', 1500, 'Alimentação'),
    ], { saldoInicial: -100 });
    assert.ok(dicas.some((d) => d.id === 'fora_da_curva' && d.texto.startsWith('Alimentação')));
    assert.ok(dicas.some((d) => d.id === 'saldo_negativo'));
  });

  test('tudo em dia: uma dica de manutenção, nunca lista vazia, e no máximo 5', () => {
    const lancamentos = [
      entrada('2026-10-05', 10000), entrada('2026-11-05', 10000), saida('2026-11-10', 3000, 'Moradia'),
      saida('2026-10-10', 3000, 'Moradia'),
    ];
    const dicas = montar(lancamentos, { saldoInicial: 50000, reserva: { temConta: true, saldo: 50000 } });
    assert.equal(dicas.length, 1);
    assert.equal(dicas[0].id, 'tudo_em_dia');
    const muitas = gerarDicasPorRegras({
      indicadores: ['taxa_poupanca', 'comprometimento_cartoes', 'reserva_emergencia', 'parcelas_futuras', 'regra_50_30_20', 'categoria_fora_da_curva']
        .map((id) => ({ id, status: 'alerta', valor: { necessidades: 80, desejos: 40, poupanca: 0 } })),
      contexto: { renda: 1000, despesaMediaMensal: 1000, reservaSaldo: 0, foraDaCurva: { categoria: 'Lazer' }, cartoes: [{ nome: 'X', percentualDoLimite: 90 }] },
      projecao: { fica_negativo: true, primeiro_mes_negativo: '2026-12' },
    });
    assert.equal(muitas.length, 5);
  });
});

describe('serviço de IA (opcional, com degradação silenciosa)', () => {
  const resumo = resumirParaIa(
    [{ id: 'taxa_poupanca', titulo: 'x', status: 'alerta', valor: 4, mensagem: 'dados pessoais' }],
    { fica_negativo: false },
  );
  const resposta = (corpo, ok = true, status = 200) => async () => ({ ok, status, json: async () => corpo });
  const textoIa = (texto) => ({ content: [{ type: 'text', text: texto }] });

  test('o resumo enviado à IA tem só id, status e valor (sem mensagens nem títulos)', () => {
    assert.deepEqual(resumo, { indicadores: [{ id: 'taxa_poupanca', status: 'alerta', valor: 4 }], saldo_fica_negativo: false });
  });

  test('sem chave configurada, não chama o serviço', async () => {
    const buscar = async () => { throw new Error('não devia chamar'); };
    assert.deepEqual(await gerarDicasIa(resumo, { chave: '', buscar }), []);
  });

  test('lê a lista de dicas, inclusive dentro de bloco de código, e limita quantidade e tamanho', () => {
    assert.deepEqual(lerDicas('["a","b","c"]'), ['a', 'b']);
    assert.deepEqual(lerDicas('```json\n["dica"]\n```'), ['dica']);
    assert.equal(lerDicas(JSON.stringify(['x'.repeat(500)]))[0].length, 200);
    assert.throws(() => lerDicas('{"a":1}'));
    assert.throws(() => lerDicas('não é json'));
  });

  test('resposta válida vira dicas com origem "ia"', async () => {
    const dicas = await dicasDaIaOuVazio(resumo, () => gerarDicasIa(resumo, {
      chave: 'k', buscar: resposta(textoIa('["Revise assinaturas que você não usa."]')),
    }));
    assert.deepEqual(dicas, [{ id: 'ia_1', texto: 'Revise assinaturas que você não usa.', origem: 'ia' }]);
  });

  test('falhas (rede, 500, 429, JSON ruim, tempo esgotado) viram lista vazia, sem lançar', async () => {
    const original = console.warn;
    console.warn = () => {};
    try {
      const falhas = [
        async () => { throw new Error('ECONNREFUSED'); },
        resposta({}, false, 500),
        resposta({}, false, 429),
        resposta(textoIa('isto não é JSON')),
        resposta({ content: [] }),
        // serviço que nunca responde: só o tempo limite encerra (o timer mantém o processo vivo, como um socket faria)
        async (_url, { signal }) => new Promise((_, rejeitar) => {
          const vivo = setTimeout(() => {}, 2000);
          signal.addEventListener('abort', () => { clearTimeout(vivo); rejeitar(signal.reason); });
        }),
      ];
      for (const buscar of falhas) {
        const dicas = await dicasDaIaOuVazio(resumo, () => gerarDicasIa(resumo, { chave: 'k', buscar, timeoutMs: 20 }));
        assert.deepEqual(dicas, []);
      }
    } finally {
      console.warn = original;
    }
  });
});
