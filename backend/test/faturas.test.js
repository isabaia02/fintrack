import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularFatura } from '../src/models/faturas.js';
import { montarFaturas } from '../src/models/faturasCartao.js';

const NUBANK = { diaFechamento: 3, diaVencimento: 10 };
const VISA = { diaFechamento: 25, diaVencimento: 5 };

// ---- calcularFatura: exemplos da tabela 10.3 do enunciado ----

test('tabela 10.3: Nubank, compra em 02/11/2026 (antes do fechamento) cai na fatura 11/2026', () => {
  assert.deepEqual(calcularFatura('2026-11-02', NUBANK), {
    referencia: '2026-11', fechamento: '2026-11-03', vencimento: '2026-11-10',
  });
});

test('tabela 10.3: Nubank, compra no dia do fechamento (03/11/2026) cai na fatura do mês seguinte', () => {
  assert.deepEqual(calcularFatura('2026-11-03', NUBANK), {
    referencia: '2026-12', fechamento: '2026-12-03', vencimento: '2026-12-10',
  });
});

test('tabela 10.3: Visa, compra em 28/12/2026 cai em 25/01/2027 e vence em 05/02/2027', () => {
  assert.deepEqual(calcularFatura('2026-12-28', VISA), {
    referencia: '2027-02', fechamento: '2027-01-25', vencimento: '2027-02-05',
  });
});

test('tabela 10.3: Visa, parcela 3/3 de uma compra em 20/12/2026 cai 2 meses depois (03/2027)', () => {
  assert.deepEqual(calcularFatura('2026-12-20', VISA, 3), {
    referencia: '2027-03', fechamento: '2027-02-25', vencimento: '2027-03-05',
  });
});

test('a parcela k cai k-1 meses depois da fatura da primeira parcela', () => {
  const primeira = calcularFatura('2026-11-15', NUBANK, 1);
  assert.equal(primeira.referencia, '2026-12');
  assert.equal(calcularFatura('2026-11-15', NUBANK, 2).referencia, '2027-01');
  assert.equal(calcularFatura('2026-11-15', NUBANK, 14).referencia, '2028-01');
});

test('fechamento no dia 31 é ajustado para o último dia de meses curtos', () => {
  const cartao = { diaFechamento: 31, diaVencimento: 10 };
  assert.equal(calcularFatura('2027-01-15', cartao).fechamento, '2027-01-31');
  assert.equal(calcularFatura('2027-02-15', cartao).fechamento, '2027-02-28');
  assert.equal(calcularFatura('2028-02-15', cartao).fechamento, '2028-02-29');
});

// ---- montarFaturas: exemplo do design (Faturas — Visa crédito) ----

const parcela = (id, fonte, descricao, data, valor, atual, total) => (
  { id, fonte_destino_id: fonte, descricao, data, valor, parcela_atual: atual, total_parcelas: total }
);

// Notebook em 10x de R$ 450,00 (compra em 20/09/2026) e "Cabo e carregador" em 3x, no Visa (id 1).
const lancamentosVisa = [
  ...Array.from({ length: 10 }, (_, i) => {
    const mes = 9 + i; // setembro/2026 em diante
    const data = `${2026 + Math.floor((mes - 1) / 12)}-${String(((mes - 1) % 12) + 1).padStart(2, '0')}-20`;
    return parcela(100 + i, 1, 'Notebook', data, 450, i + 1, 10);
  }),
  parcela(200, 1, 'Cabo e carregador', '2026-11-15', 33.34, 1, 3),
  parcela(201, 1, 'Cabo e carregador', '2026-12-15', 33.33, 2, 3),
  parcela(202, 1, 'Cabo e carregador', '2027-01-15', 33.33, 3, 3),
  parcela(300, 1, 'Cinema', '2026-11-10', 72, 1, 1),
];

const cartaoVisa = { id: 1, nome: 'Visa crédito', dia_fechamento: 25, dia_vencimento: 5, limite: 5000 };

test('exemplo do design: Visa em 22/11/2026 tem fatura aberta 12/2026 = 555,34 e as 3 próximas', () => {
  const [visa] = montarFaturas({ cartoes: [cartaoVisa], lancamentos: lancamentosVisa, hoje: '2026-11-22', meses: 3 });

  assert.deepEqual(visa.faturas.map((f) => [f.referencia, f.total, f.aberta]), [
    ['12/2026', 555.34, true],
    ['01/2027', 483.33, false],
    ['02/2027', 483.33, false],
    ['03/2027', 450, false],
  ]);
  assert.deepEqual(
    [visa.faturas[0].fechamento, visa.faturas[0].vencimento],
    ['2026-11-25', '2026-12-05'],
  );
  assert.deepEqual(
    visa.faturas[0].itens.map((i) => [i.descricao, i.data, i.valor, `${i.parcela_atual}/${i.total_parcelas}`]),
    [
      ['Cinema', '2026-11-10', 72, '1/1'],
      ['Cabo e carregador', '2026-11-15', 33.34, '1/3'],
      ['Notebook', '2026-11-20', 450, '3/10'],
    ],
  );
});

test('exemplo do design: limite utilizado 3.772,00 e disponível 1.228,00', () => {
  const [visa] = montarFaturas({ cartoes: [cartaoVisa], lancamentos: lancamentosVisa, hoje: '2026-11-22', meses: 3 });
  assert.equal(visa.limite, 5000);
  assert.equal(visa.limite_utilizado, 3772);
  assert.equal(visa.limite_disponivel, 1228);
});

test('o limite utilizado conta parcelas além da janela exibida e ignora as de faturas já vencidas', () => {
  const [visa] = montarFaturas({ cartoes: [cartaoVisa], lancamentos: lancamentosVisa, hoje: '2026-11-22', meses: 0 });
  assert.equal(visa.faturas.length, 1);
  assert.equal(visa.limite_utilizado, 3772); // parcelas 1 e 2 do notebook (fatura 10/2026 e 11/2026) já venceram
});

test('a fatura já fechada e ainda não vencida aparece antes da atual (aberta: false) e compromete o limite', () => {
  // 28/12/2026: a fatura que fechou em 25/12 vence só em 05/01/2027; a aberta passa a ser a que fecha em 25/01.
  const [visa] = montarFaturas({ cartoes: [cartaoVisa], lancamentos: lancamentosVisa, hoje: '2026-12-28', meses: 1 });
  assert.deepEqual(visa.faturas.map((f) => [f.referencia, f.aberta, f.total]), [
    ['01/2027', false, 483.33],
    ['02/2027', true, 483.33],
    ['03/2027', false, 450],
  ]);
  // notebook 4..10 (7 × 450) + cabo 2/3 e 3/3 (66,66); o cinema e as parcelas de novembro já venceram
  assert.equal(visa.limite_utilizado, 3150 + 66.66);
});

test('entre o fechamento e o vencimento, a fatura a pagar continua na lista com o valor que pesa no limite', () => {
  const lancamentos = [parcela(1, 1, 'Notebook', '2026-11-20', 450, 1, 1)];
  const consultar = (hoje) => montarFaturas({ cartoes: [cartaoVisa], lancamentos, hoje, meses: 1 })[0];

  // 26/11: a fatura que fechou em 25/11 vence em 05/12
  const fechada = consultar('2026-11-26');
  assert.deepEqual(fechada.faturas.map((f) => [f.referencia, f.aberta, f.total]), [
    ['12/2026', false, 450],
    ['01/2027', true, 0],
    ['02/2027', false, 0],
  ]);
  assert.equal(fechada.limite_utilizado, 450);

  // no dia do vencimento ela ainda é devida; no dia seguinte sai da lista e do limite
  assert.deepEqual(consultar('2026-12-05').faturas.map((f) => f.referencia), ['12/2026', '01/2027', '02/2027']);
  const paga = consultar('2026-12-06');
  assert.deepEqual(paga.faturas.map((f) => f.referencia), ['01/2027', '02/2027']);
  assert.equal(paga.limite_utilizado, 0);
});

test('exemplo do design: Nubank em 22/11/2026 tem fatura aberta 12/2026 = 361,30 e as 3 próximas vazias', () => {
  const nubank = { id: 2, nome: 'Nubank', dia_fechamento: 3, dia_vencimento: 10, limite: 8000 };
  const lancamentos = [
    parcela(1, 2, 'Supermercado', '2026-11-06', 312.4, 1, 1),
    parcela(2, 2, 'Uber', '2026-11-08', 48.9, 1, 1),
  ];
  const [resultado] = montarFaturas({ cartoes: [nubank], lancamentos, hoje: '2026-11-22', meses: 3 });

  assert.deepEqual(resultado.faturas.map((f) => [f.referencia, f.total, f.aberta]), [
    ['12/2026', 361.3, true],
    ['01/2027', 0, false],
    ['02/2027', 0, false],
    ['03/2027', 0, false],
  ]);
  assert.deepEqual(
    [resultado.faturas[0].fechamento, resultado.faturas[0].vencimento],
    ['2026-12-03', '2026-12-10'],
  );
  assert.deepEqual(resultado.faturas[0].itens.map((i) => [i.descricao, i.valor]), [['Supermercado', 312.4], ['Uber', 48.9]]);
  assert.ok(resultado.faturas.slice(1).every((f) => f.itens.length === 0));
  assert.equal(resultado.limite_utilizado, 361.3);
  assert.equal(resultado.limite_disponivel, 7638.7);
});

test('cartão sem lançamentos devolve faturas com itens vazios e total 0', () => {
  const nubank = { id: 2, nome: 'Nubank', dia_fechamento: 3, dia_vencimento: 10, limite: 8000 };
  const [resultado] = montarFaturas({ cartoes: [nubank], lancamentos: lancamentosVisa, hoje: '2026-11-22', meses: 3 });

  assert.equal(resultado.faturas.length, 4);
  assert.ok(resultado.faturas.every((f) => f.itens.length === 0 && f.total === 0));
  assert.deepEqual(resultado.faturas.map((f) => f.aberta), [true, false, false, false]);
  assert.equal(resultado.limite_utilizado, 0);
  assert.equal(resultado.limite_disponivel, 8000);
});

test('compra feita no dia do fechamento entra na fatura do mês seguinte', () => {
  const lancamentos = [parcela(1, 1, 'Mercado', '2026-11-25', 100, 1, 1)];
  const [visa] = montarFaturas({ cartoes: [cartaoVisa], lancamentos, hoje: '2026-11-22', meses: 3 });
  assert.deepEqual(visa.faturas.map((f) => f.total), [0, 100, 0, 0]); // 12/2026, 01/2027, ...
});

test('hoje no dia do fechamento: a fatura aberta já é a do mês seguinte', () => {
  const [visa] = montarFaturas({ cartoes: [cartaoVisa], lancamentos: [], hoje: '2026-11-25', meses: 0 });
  const aberta = visa.faturas.filter((f) => f.aberta);
  assert.equal(aberta.length, 1);
  assert.equal(aberta[0].referencia, '01/2027');
  assert.equal(aberta[0].fechamento, '2026-12-25');
});

test('lançamentos de outro cartão não entram, e a soma é feita em centavos', () => {
  const lancamentos = [
    parcela(1, 1, 'A', '2026-11-10', 0.1, 1, 1),
    parcela(2, 1, 'B', '2026-11-11', 0.2, 1, 1),
    parcela(3, 99, 'De outro cartão', '2026-11-12', 500, 1, 1),
  ];
  const [visa] = montarFaturas({ cartoes: [cartaoVisa], lancamentos, hoje: '2026-11-22', meses: 0 });
  assert.equal(visa.faturas[0].total, 0.3); // 0.1 + 0.2 em float daria 0.30000000000000004
  assert.equal(visa.faturas[0].itens.length, 2);
  assert.equal(visa.limite_utilizado, 0.3);
});
