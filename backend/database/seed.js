import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import pg from 'pg';

const SENHA = 'senha1234'; // senha dos usuários de demonstração

const usuarios = [
  { nome: 'Ana Souza', email: 'ana@email.com', cpf: '52998224725' },
  { nome: 'Bruno Lima', email: 'bruno@email.com', cpf: '11144477735' },
];

const categoriasPadrao = [
  ['Salário', 'entrada'], ['Outros', 'entrada'],
  ['Alimentação', 'saida'], ['Moradia', 'saida'], ['Saúde', 'saida'],
  ['Mobilidade', 'saida'], ['Lazer', 'saida'], ['Educação', 'saida'], ['Outros', 'saida'],
];

const fontes = [
  { nome: 'Salário', tipo: 'renda' },
  { nome: 'Conta corrente', tipo: 'conta' },
  { nome: 'Poupança', tipo: 'conta', reserva: true },
  { nome: 'Cartão Nubank', tipo: 'cartao_credito', fech: 3, venc: 10, limite: 5000 },
  { nome: 'Visa crédito', tipo: 'cartao_credito', fech: 25, venc: 5, limite: 3000 },
];

function dividir(valor, n) {
  const centavos = Math.round(valor * 100);
  const base = Math.floor(centavos / n);
  const resto = centavos - base * n;
  return Array.from({ length: n }, (_, i) => (base + (i === 0 ? resto : 0)) / 100);
}

const iso = (ano, mes, dia) => new Date(Date.UTC(ano, mes, dia)).toISOString().slice(0, 10);

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  await client.query('BEGIN');
  const hash = await bcrypt.hash(SENHA, 10);
  const hoje = new Date();

  for (const u of usuarios) {
    const { rows: [usr] } = await client.query(
      `INSERT INTO usuarios (nome, email, cpf, senha_hash) VALUES ($1,$2,$3,$4) RETURNING id`,
      [u.nome, u.email, u.cpf, hash],
    );

    const cat = {};
    for (const [nome, tipo] of categoriasPadrao) {
      const { rows: [c] } = await client.query(
        `INSERT INTO categorias (usuario_id, nome, tipo) VALUES ($1,$2,$3) RETURNING id`,
        [usr.id, nome, tipo],
      );
      cat[`${nome}:${tipo}`] = c.id;
    }

    const fd = {};
    for (const f of fontes) {
      const { rows: [r] } = await client.query(
        `INSERT INTO fontes_destinos (usuario_id, nome, tipo, dia_fechamento, dia_vencimento, limite, reserva)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [usr.id, f.nome, f.tipo, f.fech ?? null, f.venc ?? null, f.limite ?? null, f.reserva ?? false],
      );
      fd[f.nome] = r.id;
    }

    const inserir = (tipo, descricao, valor, data, categoria, fonte, parcela = 1, total = 1, grupo = null) =>
      client.query(
        `INSERT INTO lancamentos (usuario_id, tipo, descricao, valor, data, categoria_id, fonte_destino_id,
                                  parcela_atual, total_parcelas, grupo_parcelamento)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [usr.id, tipo, descricao, valor, data, cat[`${categoria}:${tipo}`], fd[fonte], parcela, total, grupo],
      );

      for (let delta = -3; delta <= 0; delta++) {
      const a = hoje.getUTCFullYear();
      const m = hoje.getUTCMonth() + delta;
      await inserir('entrada', 'Salário', 4500, iso(a, m, 5), 'Salário', 'Salário');
      await inserir('saida', 'Aluguel', 1500, iso(a, m, 6), 'Moradia', 'Conta corrente');
      await inserir('saida', 'Supermercado', 650 + delta * -20, iso(a, m, 10), 'Alimentação', 'Cartão Nubank');
      await inserir('saida', 'Combustível', 280, iso(a, m, 12), 'Mobilidade', 'Visa crédito');
      await inserir('saida', 'Cinema e jantar', 190, iso(a, m, 18), 'Lazer', 'Cartão Nubank');
      await inserir('saida', 'Farmácia', 85.9, iso(a, m, 20), 'Saúde', 'Conta corrente');
    }

    const grupo = randomUUID();
    const dataCompra = iso(hoje.getUTCFullYear(), hoje.getUTCMonth() - 2, 15);
    const parcelas = dividir(3000, 10);
    for (let i = 0; i < parcelas.length; i++) {
      await inserir('saida', 'Notebook', parcelas[i], dataCompra, 'Educação', 'Cartão Nubank', i + 1, 10, grupo);
    }
  }

  await client.query('COMMIT');
  console.log(`Seed concluído. Usuários: ${usuarios.map((u) => u.email).join(', ')} | senha: ${SENHA}`);
} catch (erro) {
  await client.query('ROLLBACK');
  console.error('Falha no seed:', erro.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
