// Utilitários de formatação e máscara (pt-BR). Funções puras, sem dependência de React.

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

// formatarMoeda(1234.5) -> "R$ 1.234,50"; com sinal: "+ R$ 1.234,50" / "− R$ 1.234,50".
export function formatarMoeda(valor, { comSinal = false } = {}) {
  const numero = moeda.format(Math.abs(Number(valor) || 0)).replace(/ /g, ' ');
  if (!Number(valor)) return numero;
  if (comSinal) return `${valor > 0 ? '+' : '−'} ${numero}`;
  return valor < 0 ? `− ${numero}` : numero;
}

// formatarData('2026-11-18') ou Date -> "18/11/2026". Strings ISO não passam por fuso horário.
export function formatarData(data) {
  if (!data) return '';
  if (typeof data === 'string') {
    const [ano, mes, dia] = data.slice(0, 10).split('-');
    return `${dia}/${mes}/${ano}`;
  }
  const dd = String(data.getDate()).padStart(2, '0');
  const mm = String(data.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${data.getFullYear()}`;
}

// "52998224725" -> "529.982.247-25" (aceita digitação parcial)
export function mascararCpf(texto) {
  const d = String(texto ?? '').replace(/\D/g, '').slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

// Máscara de valor digitado: "123456" -> "1.234,56" (os dígitos entram como centavos).
export function mascararValor(texto) {
  const d = String(texto ?? '').replace(/\D/g, '').replace(/^0+/, '');
  if (!d) return '';
  const centavos = d.padStart(3, '0');
  const inteiro = centavos.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${inteiro},${centavos.slice(-2)}`;
}

// "1.234,56" -> 1234.56 (número para enviar à API); vazio -> null
export function valorDaMascara(texto) {
  const d = String(texto ?? '').replace(/\D/g, '');
  return d ? Number(d) / 100 : null;
}

// Mês "2026-11" -> "Novembro 2026"
export function rotuloMes(ano, mes) {
  const nome = new Date(Date.UTC(ano, mes, 1)).toLocaleDateString('pt-BR', { month: 'long', timeZone: 'UTC' });
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)} ${ano}`;
}
