import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lerPeriodo, mesCorrente } from '../src/utils/periodo.js';

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
