import { randomUUID } from 'node:crypto';
import { categoriasPadrao } from '../src/models/padroes.js';
import { dividirEmParcelas, somarMeses } from '../src/models/parcelamento.js';

export const SENHA_DEMONSTRACAO = 'senha1234';

const entrada = (data, descricao, valor, categoria, fonte) => ({ tipo: 'entrada', data, descricao, valor, categoria, fonte });
const saida = (data, descricao, valor, categoria, fonte) => ({ tipo: 'saida', data, descricao, valor, categoria, fonte });

const ana = {
  nome: 'Ana Souza',
  email: 'ana@email.com',
  cpf: '52998224725',
  categoriasExtras: [],
  fontes: [
    { nome: 'Salário', tipo: 'renda' },
    { nome: 'Conta corrente', tipo: 'conta' },
    { nome: 'Poupança', tipo: 'conta', reserva: true },
    { nome: 'Nubank', tipo: 'cartao_credito', diaFechamento: 3, diaVencimento: 10, limite: 8000 },
    { nome: 'Visa crédito', tipo: 'cartao_credito', diaFechamento: 25, diaVencimento: 5, limite: 5000 },
  ],
  lancamentos: [
    entrada('2026-09-05', 'Salário', 6800, 'Salário', 'Salário'),
    saida('2026-09-05', 'Aluguel', 1500, 'Moradia', 'Conta corrente'),
    saida('2026-09-07', 'Supermercado', 540, 'Alimentação', 'Conta corrente'),
    saida('2026-09-10', 'Combustível', 450, 'Mobilidade', 'Conta corrente'),
    entrada('2026-09-15', 'Site para cliente', 1000, 'Freelance', 'Poupança'),
    saida('2026-09-18', 'Uber', 362.3, 'Mobilidade', 'Conta corrente'),
    saida('2026-09-21', 'Feira', 330, 'Alimentação', 'Conta corrente'),

    entrada('2026-10-05', 'Salário', 6800, 'Salário', 'Salário'),
    saida('2026-10-05', 'Aluguel', 1500, 'Moradia', 'Conta corrente'),
    saida('2026-10-06', 'Supermercado', 612.3, 'Alimentação', 'Conta corrente'),
    saida('2026-10-09', 'Combustível', 480, 'Mobilidade', 'Conta corrente'),
    entrada('2026-10-15', 'Identidade visual', 1000, 'Freelance', 'Poupança'),
    saida('2026-10-17', 'Restaurante', 368.2, 'Alimentação', 'Conta corrente'),
    saida('2026-10-22', 'Uber', 289.5, 'Mobilidade', 'Conta corrente'),

    entrada('2026-11-05', 'Salário', 6800, 'Salário', 'Salário'),
    saida('2026-11-05', 'Aluguel', 1500, 'Moradia', 'Conta corrente'),
    saida('2026-11-06', 'Supermercado', 312.4, 'Alimentação', 'Nubank'),
    saida('2026-11-08', 'Uber', 48.9, 'Mobilidade', 'Nubank'),
    saida('2026-11-09', 'Consulta dermatologista', 250, 'Saúde', 'Conta corrente'),
    saida('2026-11-10', 'Cinema', 72, 'Lazer', 'Visa crédito'),
    entrada('2026-11-12', 'Logo para cliente', 550, 'Freelance', 'Conta corrente'),
  ],
  parcelados: [
    { dataCompra: '2026-09-20', descricao: 'Notebook', total: 4500, parcelas: 10, categoria: 'Educação', fonte: 'Visa crédito' },
    { dataCompra: '2026-11-15', descricao: 'Cabo e carregador', total: 100, parcelas: 3, categoria: 'Outros', fonte: 'Visa crédito' },
  ],
};

export const CATEGORIA_NOME_LONGO = 'Manutenção da casa, reformas, consertos e imprevistos do mês';
export const DESCRICAO_LONGA = 'Reforma completa do banheiro social com troca de piso, revestimento, louça, metais e mão de obra do pedreiro e encanador';
export const VALOR_ALTO = 1234567.89;

const DESPESAS_DO_MES = [
  ['Padaria', 'Alimentação'],
  ['Supermercado', 'Alimentação'],
  ['Uber', 'Mobilidade'],
  ['Ônibus', 'Mobilidade'],
  ['Farmácia', 'Saúde'],
  ['Streaming', 'Lazer'],
  ['Curso online', 'Educação'],
  ['Presente', 'Outros'],
];

const diaDeNovembro = (dia) => `2026-11-${String(dia).padStart(2, '0')}`;
const valorDaDespesa = (i) => Math.round((9.9 + i * 3.17) * 100) / 100;

const bruno = {
  nome: 'Bruno Lima',
  email: 'bruno@email.com',
  cpf: '11144477735',
  categoriasExtras: [{ nome: CATEGORIA_NOME_LONGO, tipo: 'saida', cor: null }],
  fontes: [
    { nome: 'Salário', tipo: 'renda' },
    { nome: 'Conta corrente', tipo: 'conta' },
  ],
  lancamentos: [
    entrada('2026-11-05', 'Salário', 4500, 'Salário', 'Salário'),
    saida('2026-11-03', 'Quitação do financiamento do apartamento', VALOR_ALTO, 'Moradia', 'Conta corrente'),
    saida('2026-11-14', DESCRICAO_LONGA, 18750, CATEGORIA_NOME_LONGO, 'Conta corrente'),
    ...Array.from({ length: 61 }, (_, i) => {
      const [descricao, categoria] = DESPESAS_DO_MES[i % DESPESAS_DO_MES.length];
      return saida(diaDeNovembro((i % 30) + 1), descricao, valorDaDespesa(i), categoria, 'Conta corrente');
    }),
  ],
  parcelados: [],
};

export const USUARIOS_DEMONSTRACAO = [ana, bruno];

async function inserirUsuario(client, usuario, senhaHash) {
  const { rows: [{ id }] } = await client.query(
    'INSERT INTO usuarios (nome, email, cpf, senha_hash) VALUES ($1, $2, $3, $4) RETURNING id',
    [usuario.nome, usuario.email, usuario.cpf, senhaHash],
  );

  const categorias = new Map();
  for (const c of [...categoriasPadrao, ...usuario.categoriasExtras]) {
    const { rows: [categoria] } = await client.query(
      'INSERT INTO categorias (usuario_id, nome, tipo, cor) VALUES ($1, $2, $3, $4) RETURNING id',
      [id, c.nome, c.tipo, c.cor],
    );
    categorias.set(`${c.tipo}:${c.nome}`, categoria.id);
  }

  const fontes = new Map();
  for (const f of usuario.fontes) {
    const { rows: [fonte] } = await client.query(
      `INSERT INTO fontes_destinos (usuario_id, nome, tipo, dia_fechamento, dia_vencimento, limite, reserva)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [id, f.nome, f.tipo, f.diaFechamento ?? null, f.diaVencimento ?? null, f.limite ?? null, f.reserva ?? false],
    );
    fontes.set(f.nome, fonte.id);
  }

  const inserirLancamento = (l, parcela = { atual: 1, total: 1, grupo: null }) => client.query(
    `INSERT INTO lancamentos (usuario_id, tipo, descricao, valor, data, categoria_id, fonte_destino_id,
                              parcela_atual, total_parcelas, grupo_parcelamento)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [id, l.tipo, l.descricao, l.valor, l.data, categorias.get(`${l.tipo}:${l.categoria}`), fontes.get(l.fonte),
      parcela.atual, parcela.total, parcela.grupo],
  );

  for (const l of usuario.lancamentos) await inserirLancamento(l);

  for (const compra of usuario.parcelados) {
    const grupo = randomUUID();
    const valores = dividirEmParcelas(compra.total, compra.parcelas);
    for (let i = 0; i < valores.length; i += 1) {
      const parcela = saida(somarMeses(compra.dataCompra, i), compra.descricao, valores[i], compra.categoria, compra.fonte);
      await inserirLancamento(parcela, { atual: i + 1, total: compra.parcelas, grupo });
    }
  }

  return id;
}

export async function popularDemonstracao(client, senhaHash) {
  await client.query(
    'DELETE FROM usuarios WHERE email = ANY($1) OR cpf = ANY($2)',
    [USUARIOS_DEMONSTRACAO.map((u) => u.email), USUARIOS_DEMONSTRACAO.map((u) => u.cpf)],
  );

  const ids = {};
  for (const usuario of USUARIOS_DEMONSTRACAO) {
    ids[usuario.email] = await inserirUsuario(client, usuario, senhaHash);
  }
  return ids;
}
