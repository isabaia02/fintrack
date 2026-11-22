import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lerPeriodo, mesCorrente, periodoAnterior } from '../src/utils/periodo.js';

test('mês corrente segue o horário de Brasília, não o fuso do servidor', () => {
  assert.deepEqual(mesCorrente(new Date('2026-12-01T01:00:00Z')), { inicio: '2026-11-01', fim: '2026-11-30' });
  assert.deepEqual(mesCorrente(new Date('2026-12-01T03:00:00Z')), { inicio: '2026-12-01', fim: '2026-12-31' });
  assert.deepEqual(mesCorrente(new Date('2028-02-10T12:00:00Z')), { inicio: '2028-02-01', fim: '2028-02-29' });
});

test('lerPeriodo valida as datas e a ordem', () => {
  const campos = {};
  assert.deepEqual(lerPeriodo({ inicio: '2026-10-01', fim: '2026-10-31' }, campos), { inicio: '2026-10-01', fim: '2026-10-31' });
  assert.deepEqual(campos, {});

  const invalidos = {};
  lerPeriodo({ inicio: '2026-02-30', fim: '2026-01-01' }, invalidos);
  assert.deepEqual(Object.keys(invalidos), ['inicio']);

  const invertidos = {};
  lerPeriodo({ inicio: '2026-10-31', fim: '2026-10-01' }, invertidos);
  assert.equal(invertidos.fim, 'A data final deve ser igual ou posterior à data inicial.');
});

test('mês inteiro compara com o mês anterior inteiro', () => {
  assert.deepEqual(periodoAnterior('2026-10-01', '2026-10-31'), { inicio: '2026-09-01', fim: '2026-09-30' });
  assert.deepEqual(periodoAnterior('2026-11-01', '2026-11-30'), { inicio: '2026-10-01', fim: '2026-10-31' });
  assert.deepEqual(periodoAnterior('2028-03-01', '2028-03-31'), { inicio: '2028-02-01', fim: '2028-02-29' });
});

test('vários meses inteiros comparam com a mesma quantidade de meses, virando o ano', () => {
  assert.deepEqual(periodoAnterior('2027-01-01', '2027-03-31'), { inicio: '2026-10-01', fim: '2026-12-31' });
});

test('período livre compara com a mesma quantidade de dias imediatamente antes', () => {
  assert.deepEqual(periodoAnterior('2026-10-10', '2026-10-19'), { inicio: '2026-09-30', fim: '2026-10-09' });
  assert.deepEqual(periodoAnterior('2026-03-01', '2026-03-15'), { inicio: '2026-02-14', fim: '2026-02-28' });
  assert.deepEqual(periodoAnterior('2026-01-01', '2026-01-01'), { inicio: '2025-12-31', fim: '2025-12-31' });
});
