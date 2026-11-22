const URL_API = 'https://api.anthropic.com/v1/messages';
const MODELO_PADRAO = 'claude-haiku-5-5';
const TIMEOUT_MS = 4000;
export const MAX_DICAS_IA = 2;
const MAX_TEXTO = 200;

const INSTRUCAO = `Você escreve dicas curtas de educação financeira em português do Brasil.
Receba indicadores de saúde financeira em JSON e responda SOMENTE com um array JSON de até ${MAX_DICAS_IA} strings,
cada uma com no máximo ${MAX_TEXTO} caracteres, em tom gentil, concreto e sem prometer resultados.
Não recomende produtos, investimentos nem instituições.`;

export function resumirParaIa(indicadores, projecao) {
  return {
    indicadores: indicadores.map(({ id, status, valor }) => ({ id, status, valor })),
    saldo_fica_negativo: projecao.fica_negativo,
  };
}

export function lerDicas(texto) {
  const limpo = texto.trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
  const lista = JSON.parse(limpo);
  if (!Array.isArray(lista)) throw new Error('resposta da IA não é uma lista');
  return lista
    .filter((t) => typeof t === 'string' && t.trim() !== '')
    .map((t) => t.trim().slice(0, MAX_TEXTO))
    .slice(0, MAX_DICAS_IA);
}

export async function gerarDicasIa(resumo, {
  chave = process.env.ANTHROPIC_API_KEY,
  modelo = process.env.IA_MODELO || MODELO_PADRAO,
  buscar = fetch,
  timeoutMs = TIMEOUT_MS,
} = {}) {
  if (!chave) return [];
  const resposta = await buscar(URL_API, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': chave, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: modelo,
      max_tokens: 400,
      system: INSTRUCAO,
      messages: [{ role: 'user', content: JSON.stringify(resumo) }],
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!resposta.ok) throw new Error(`serviço de IA respondeu ${resposta.status}`);
  const corpo = await resposta.json();
  return lerDicas(corpo.content?.[0]?.text ?? '');
}

export async function dicasDaIaOuVazio(resumo, gerar = gerarDicasIa) {
  try {
    const textos = await gerar(resumo);
    return textos.map((texto, i) => ({ id: `ia_${i + 1}`, texto, origem: 'ia' }));
  } catch (erro) {
    console.warn(`[saude-financeira] dicas da IA indisponíveis: ${erro.message}`);
    return [];
  }
}
