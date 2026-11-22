import { formatarMoeda } from '../../utils/formatadores';

export const GRUPOS = [
  { tipo: 'renda', titulo: 'Rendas', vazio: 'Nenhuma renda cadastrada.', icone: 'payments' },
  { tipo: 'conta', titulo: 'Contas', vazio: 'Nenhuma conta cadastrada.', icone: 'account_balance' },
  { tipo: 'cartao_credito', titulo: 'Cartões de crédito', vazio: 'Nenhum cartão cadastrado.', icone: 'credit_card' },
];

export const TIPOS = [
  { valor: 'renda', rotulo: 'Renda' },
  { valor: 'conta', rotulo: 'Conta' },
  { valor: 'cartao_credito', rotulo: 'Cartão de crédito' },
];

// Mesmo texto que a API devolve no 409 de exclusão (BE-04).
export function mensagemExclusaoBloqueada(total) {
  const vinculados = total === 1 ? 'lançamento vinculado' : 'lançamentos vinculados';
  return `Este item tem ${total} ${vinculados}. Edite ou exclua esses lançamentos antes de excluir.`;
}

export function iconeDoItem(item) {
  if (item.tipo === 'conta' && item.reserva) return 'savings';
  return GRUPOS.find((g) => g.tipo === item.tipo).icone;
}

export function descricaoDoItem(item) {
  if (item.tipo === 'renda') return 'Renda';
  if (item.tipo === 'conta') return item.reserva ? 'Conta · reserva de emergência' : 'Conta';
  return `Fecha dia ${item.dia_fechamento} · vence dia ${item.dia_vencimento} · limite ${formatarMoeda(item.limite)}`;
}
