export function lerResultado(resultado, ler) {
  if (resultado.status !== 'fulfilled') return null;
  try {
    return ler(resultado.value.data) ?? null;
  } catch {
    return null;
  }
}
