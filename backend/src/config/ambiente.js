const PLACEHOLDERS_JWT = ['troque-por-um-segredo-longo-e-aleatorio'];
const TAMANHO_MINIMO_SEGREDO = 32;

export function lerOrigens(valor, producao = false) {
  if (!valor || !valor.trim()) {
    if (producao) throw new Error('CORS_ORIGIN não definido (obrigatório em produção).');
    return ['http://localhost:5173'];
  }
  const origens = valor.split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean);
  if (origens.includes('*')) throw new Error('CORS_ORIGIN não pode ser "*": liste as origens permitidas.');
  return origens;
}

export function lerTrustProxy(valor) {
  const texto = valor?.trim();
  if (!texto) return undefined;
  if (texto.toLowerCase() === 'true') return true;
  if (texto.toLowerCase() === 'false') return false;
  if (/^\d+$/.test(texto)) return Number(texto);
  return texto;
}

export function validarAmbiente(env = process.env) {
  const producao = env.NODE_ENV === 'production';
  const avisos = [];

  if (!env.DATABASE_URL) throw new Error('DATABASE_URL não definido no .env');
  if (!env.JWT_SECRET) throw new Error('JWT_SECRET não definido no .env');

  const segredoFraco = env.JWT_SECRET.length < TAMANHO_MINIMO_SEGREDO || PLACEHOLDERS_JWT.includes(env.JWT_SECRET);
  if (segredoFraco) {
    const msg = `JWT_SECRET fraco: use pelo menos ${TAMANHO_MINIMO_SEGREDO} caracteres aleatórios (não o valor do .env.example).`;
    if (producao) throw new Error(msg);
    avisos.push(msg);
  }

  const origens = lerOrigens(env.CORS_ORIGIN, producao);

  const trustProxy = lerTrustProxy(env.TRUST_PROXY);
  if (trustProxy === true) {
    avisos.push('TRUST_PROXY=true confia em qualquer X-Forwarded-For: o cliente consegue forjar o IP e escapar do rate limit. Prefira o número de proxies à frente do servidor (ex.: TRUST_PROXY=1).');
  }
  return { origens, avisos, trustProxy };
}
