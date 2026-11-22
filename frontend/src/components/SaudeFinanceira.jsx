import { useEffect, useState } from 'react';
import api from '../services/api';
import { Dicas } from './saude-financeira/Dicas';
import { ListaIndicadores } from './saude-financeira/ListaIndicadores';
import { ProjecaoSaldo } from './saude-financeira/ProjecaoSaldo';
import { Aviso } from './ui/aviso';
import { Carregando } from './ui/carregando';
import { MensagemErro } from './ui/mensagem-erro';

const AVISO_PADRAO = 'Informações educativas, não constituem recomendação financeira profissional.';

export default function SaudeFinanceira() {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let ativo = true;
    api.get('/saude-financeira')
      .then(({ data }) => {
        if (!ativo) return;
        setDados(data);
        setErro('');
      })
      .catch((e) => {
        if (!ativo) return;
        setErro(e.response?.data?.erro ?? 'Não foi possível carregar a saúde financeira.');
        setDados(null);
      });
    return () => { ativo = false; };
  }, [versao]);

  const tentarDeNovo = () => {
    setErro('');
    setDados(null);
    setVersao((v) => v + 1);
  };

  return (
    <div className="flex flex-col gap-6">
      <Aviso tom="info">{dados?.aviso ?? AVISO_PADRAO}</Aviso>

      {erro && <MensagemErro mensagem={erro} onTentarDeNovo={tentarDeNovo} />}
      {!erro && !dados && <Carregando linhas={5} />}
      {dados && (
        <div className="flex flex-col items-start gap-6 xl:flex-row">
          <ListaIndicadores indicadores={dados.indicadores} referencia={dados.referencia} />
          <div className="flex w-full flex-col gap-6 xl:w-[432px] xl:shrink-0">
            <ProjecaoSaldo projecao={dados.projecao} />
            <Dicas dicas={dados.dicas} />
          </div>
        </div>
      )}
    </div>
  );
}
