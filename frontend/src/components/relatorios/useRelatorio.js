import { useApi } from '../../hooks/useApi';

export function useRelatorio(caminho, { inicio, fim }) {
  return useApi(`/relatorios/${caminho}`, { inicio, fim }, { mensagemErro: 'Não foi possível carregar o relatório.' });
}
