import { useEffect, useState } from 'react';
import api from '../services/api';

export function useApi(caminho, params, { mensagemErro = 'Não foi possível carregar os dados.' } = {}) {
  const [versao, setVersao] = useState(0);
  const [resultado, setResultado] = useState({ chave: null, dados: null, erro: '' });
  const paramsChave = JSON.stringify(params ?? {});
  const chave = `${caminho}|${paramsChave}|${versao}`;

  useEffect(() => {
    let ativo = true;
    api.get(caminho, { params: JSON.parse(paramsChave) })
      .then(({ data }) => {
        if (ativo) setResultado({ chave, dados: data, erro: '' });
      })
      .catch((e) => {
        if (ativo) setResultado({ chave, dados: null, erro: e.response?.data?.erro ?? mensagemErro });
      });
    return () => { ativo = false; };
  }, [chave, caminho, paramsChave, mensagemErro]);

  return {
    dados: resultado.chave === chave ? resultado.dados : null,
    erro: resultado.chave === chave ? resultado.erro : '',
    carregando: resultado.chave !== chave,
    recarregar: () => setVersao((v) => v + 1),
  };
}
