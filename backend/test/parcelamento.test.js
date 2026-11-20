import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dividirEmParcelas, somarMeses } from '../src/models/parcelamento.js';

test('R$ 100,00 em 3x gera 33,34 + 33,33 + 33,33', () => {
  assert.deepEqual(dividirEmParcelas(100, 3), [33.34, 33.33, 33.33]);
});

test('divisão em centavos sempre soma o valor original', () => {
  for (const [valor, n] of [[3000, 10], [0.1, 3], [1234567.89, 48], [99.99, 7]]) {
    const parcelas = dividirEmParcelas(valor, n);
    const soma = parcelas.reduce((total, p) => total + Math.round(p * 100), 0);
    assert.equal(soma, Math.round(valor * 100));
    assert.equal(parcelas.length, n);
  }
});

test('uma parcela devolve o próprio valor', () => {
  assert.deepEqual(dividirEmParcelas(59.9, 1), [59.9]);
});

test('somarMeses avança mês e ano', () => {
  assert.equal(somarMeses('2026-11-17', 0), '2026-11-17');
  assert.equal(somarMeses('2026-11-17', 1), '2026-12-17');
  assert.equal(somarMeses('2026-11-17', 2), '2027-01-17');
});

test('somarMeses ajusta ao último dia do mês', () => {
  assert.equal(somarMeses('2026-01-31', 1), '2026-02-28');
  assert.equal(somarMeses('2028-01-31', 1), '2028-02-29');
  assert.equal(somarMeses('2026-01-31', 2), '2026-03-31');
});
