import { useEffect, useRef, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import api from '../services/api';
import { usePeriodo } from '../contexts/periodo';
import { dataDeHoje } from '../utils/formatadores';
import { ACAO_PADRAO } from './layout/navegacao';
import { BalancoMes } from './dashboard/BalancoMes';
import { EsqueletoResumo } from './dashboard/EsqueletoResumo';
import { Divisor, PainelDetalhes } from './dashboard/PainelDetalhes';
import { PrimeiroUso } from './dashboard/PrimeiroUso';
import { ProximasFaturas } from './dashboard/ProximasFaturas';
import { SaidasPorCategoria } from './dashboard/SaidasPorCategoria';
import { SaldoPorConta } from './dashboard/SaldoPorConta';
import { Secao } from './dashboard/Secao';
import { UltimosLancamentos } from './dashboard/UltimosLancamentos';
import { BannerErro } from './ui/banner-erro';

const QUANTIDADE_ULTIMOS = 4;
const MESES_FATURAS = 3;
const TODO_O_HISTORICO = { inicio: '1900-01-01', fim: '2100-12-31' };

function lerResultado(resultado, ler) {
  if (resultado.status !== 'fulfilled') return null;
  try {
    return ler(resultado.value.data) ?? null;
  } catch {
    return null;
  }
}

async function consultarHistorico() {
  try {
    const { data } = await api.get('/lancamentos', { params: TODO_O_HISTORICO });
    return data.total > 0;
  } catch {
    return null;
  }
}

const semConexao = (resultado) => resultado.status === 'rejected' && !resultado.reason?.response;

async function carregarResumo(periodo, historico) {
  const resultados = await Promise.allSettled([
    api.get('/lancamentos', { params: periodo }),
    api.get('/relatorios/categorias', { params: periodo }),
    api.get('/relatorios/fontes-destinos', { params: periodo }),
    api.get('/relatorios/faturas', { params: { meses: MESES_FATURAS } }),
  ]);
  const [lancamentos, categorias, fontes, faturas] = resultados;

  const resumo = {
    lancamentos: lerResultado(lancamentos, (d) => d),
    categorias: lerResultado(categorias, (d) => d.saidas?.categorias),
    contas: lerResultado(fontes, (d) => d.contas),
    cartoes: lerResultado(faturas, (d) => d.cartoes),
  };
  resumo.offline = resultados.some(semConexao);
  const totalDoMes = resumo.lancamentos?.total;
  if (totalDoMes > 0) resumo.historico = true;
  else if (totalDoMes === 0) resumo.historico = historico ?? await consultarHistorico();
  else resumo.historico = historico;
  resumo.primeiroUso = totalDoMes === 0 && resumo.historico === false;
  return resumo;
}

const chaveDoResumo = (inicio, fim, versao) => `${inicio}:${fim}#${versao}`;

export default function Dashboard() {
  const navigate = useNavigate();
  const { bloquearAcao } = useOutletContext();
  const { inicio, fim, noMesAtual } = usePeriodo();
  const [versao, setVersao] = useState(0);
  const [estado, setEstado] = useState({ chave: null, resumo: null });
  const historico = useRef(null);

  const carregando = estado.chave !== chaveDoResumo(inicio, fim, versao);

  useEffect(() => {
    let ativo = true;
    const chave = chaveDoResumo(inicio, fim, versao);
    carregarResumo({ inicio, fim }, historico.current).then((resumo) => {
      historico.current = resumo.historico;
      if (ativo) setEstado({ chave, resumo });
    });
    return () => { ativo = false; };
  }, [inicio, fim, versao]);

  useEffect(() => {
    bloquearAcao(carregando);
    return () => bloquearAcao(false);
  }, [bloquearAcao, carregando]);

  if (carregando) return <EsqueletoResumo />;

  const { lancamentos, categorias, contas, cartoes, primeiroUso, offline } = estado.resumo;
  const novoLancamento = () => navigate(ACAO_PADRAO.destino);

  if (primeiroUso) {
    return (
      <div className="flex flex-1 flex-col gap-8">
        <BalancoMes totais={lancamentos.totais} primeiroUso />
        <PrimeiroUso aoCriar={novoLancamento} />
      </div>
    );
  }

  const falhou = !lancamentos || offline;
  const hoje = dataDeHoje();
  const recentes = noMesAtual ? lancamentos?.itens.filter((l) => l.data <= hoje) : lancamentos?.itens;

  return (
    <div className="flex flex-col gap-8">
      {falhou && (
        <BannerErro
          titulo="Não foi possível carregar o resumo."
          detalhe="Verifique sua conexão e tente de novo."
          onTentarDeNovo={() => setVersao((v) => v + 1)}
        />
      )}

      {lancamentos ? (
        <>
          <BalancoMes totais={lancamentos.totais} />
          <PainelDetalhes
            esquerda={(
              <>
                <SaidasPorCategoria categorias={categorias} />
                <Divisor />
                <SaldoPorConta contas={contas} />
              </>
            )}
            direita={(
              <>
                <ProximasFaturas cartoes={cartoes} />
                <Divisor />
                <UltimosLancamentos lancamentos={recentes.slice(0, QUANTIDADE_ULTIMOS)} />
              </>
            )}
          />
        </>
      ) : (
        <PainelDetalhes
          divisor={false}
          esquerda={<Secao titulo="Saídas por categoria" itens={null} className="gap-4" />}
          direita={<Secao titulo="Próximas faturas" itens={null} className="gap-4" />}
        />
      )}
    </div>
  );
}
