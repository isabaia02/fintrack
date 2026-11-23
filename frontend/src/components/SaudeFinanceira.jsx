import { useApi } from '../hooks/useApi';
import { Dicas } from './saude-financeira/Dicas';
import { ListaIndicadores } from './saude-financeira/ListaIndicadores';
import { ProjecaoSaldo } from './saude-financeira/ProjecaoSaldo';
import { Aviso } from './ui/aviso';
import { Carregando } from './ui/carregando';
import { MensagemErro } from './ui/mensagem-erro';

const AVISO_PADRAO = 'Informações educativas, não constituem recomendação financeira profissional.';

export default function SaudeFinanceira() {
  const { dados, erro, recarregar } = useApi('/saude-financeira', undefined, {
    mensagemErro: 'Não foi possível carregar a saúde financeira.',
  });

  return (
    <div className="flex flex-col gap-6">
      <Aviso tom="info">{dados?.aviso ?? AVISO_PADRAO}</Aviso>

      {erro && <MensagemErro mensagem={erro} onTentarDeNovo={recarregar} />}
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
