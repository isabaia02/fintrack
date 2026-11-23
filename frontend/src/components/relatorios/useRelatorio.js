import { useEffect, useState } from 'react';
import api from '../../services/api';

export function useRelatorio(caminho, { inicio, fim }) {
  const [versao, setVersao] = useState(0);
  const [resultado, setResultado] = useState({ chave: null, dados: null, erro: '' });
  const chave = `${caminho}|${inicio}|${fim}|${versao}`;

  useEffect(() => {
    let ativo = true;
    api.get(`/relatorios/${caminho}`, { params: { inicio, fim } })
      .then(({ data }) => {
        if (ativo) setResultado({ chave, dados: data, erro: '' });
      })
      .catch((e) => {
        const mensagem = e.response?.data?.erro ?? 'Não foi possível carregar o relatório.';
        if (ativo) setResultado({ chave, dados: null, erro: mensagem });
      });
    return () => { ativo = false; };
  }, [chave, caminho, inicio, fim]);

  return {
    dados: resultado.chave === chave ? resultado.dados : null,
    erro: resultado.chave === chave ? resultado.erro : '',
    carregando: resultado.chave !== chave,
    recarregar: () => setVersao((v) => v + 1),
  };
}
