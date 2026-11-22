import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { usePeriodo } from '../contexts/periodo';
import { BarraFiltros } from './lancamentos/BarraFiltros';
import { TabelaLancamentos } from './lancamentos/TabelaLancamentos';
import { TotaisPeriodo } from './lancamentos/TotaisPeriodo';
import { Carregando } from './ui/carregando';
import { ListaVazia } from './ui/lista-vazia';
import { MensagemErro } from './ui/mensagem-erro';
import { Paginacao } from './ui/paginacao';

const TAMANHO_PAGINA = 20;
const FILTROS_INICIAIS = { tipo: 'todos', categoriaId: '', fonteDestinoId: '' };

function montarParametros({ inicio, fim, pagina, tipo, categoriaId, fonteDestinoId }) {
  const params = { inicio, fim, pagina };
  if (tipo !== 'todos') params.tipo = tipo;
  if (categoriaId) params.categoriaId = categoriaId;
  if (fonteDestinoId) params.fonteDestinoId = fonteDestinoId;
  return params;
}

const chaveDaConsulta = (params, versao) => `${JSON.stringify(params)}#${versao}`;

export default function Lancamentos() {
  const [, setSearchParams] = useSearchParams();
  const periodo = usePeriodo();
  const [filtros, setFiltros] = useState(FILTROS_INICIAIS);
  const [pagina, setPagina] = useState(1);
  const [versao, setVersao] = useState(0);
  const [opcoes, setOpcoes] = useState({ categorias: [], fontes: [], erro: false });
  const [versaoOpcoes, setVersaoOpcoes] = useState(0);
  const [resultado, setResultado] = useState({ chave: null, dados: null, erro: '' });

  const { inicio, fim } = periodo;
  const chave = chaveDaConsulta(montarParametros({ inicio, fim, pagina, ...filtros }), versao);
  const carregando = resultado.chave !== chave;

  useEffect(() => {
    let ativo = true;
    Promise.allSettled([api.get('/categorias'), api.get('/fontes-destinos')]).then(([categorias, fontes]) => {
      if (!ativo) return;
      setOpcoes({
        categorias: categorias.status === 'fulfilled' ? categorias.value.data : [],
        fontes: fontes.status === 'fulfilled' ? fontes.value.data : [],
        erro: categorias.status === 'rejected' || fontes.status === 'rejected',
      });
    });
    return () => { ativo = false; };
  }, [versaoOpcoes]);

  useEffect(() => {
    let ativo = true;
    const params = montarParametros({ inicio, fim, pagina, ...filtros });
    const chaveAtual = chaveDaConsulta(params, versao);
    api.get('/lancamentos', { params })
      .then(({ data }) => {
        if (ativo) setResultado({ chave: chaveAtual, dados: data, erro: '' });
      })
      .catch((e) => {
        if (ativo) setResultado({ chave: chaveAtual, dados: null, erro: e.response?.data?.erro ?? 'Não foi possível carregar os lançamentos.' });
      });
    return () => { ativo = false; };
  }, [inicio, fim, pagina, filtros, versao]);

  const comFiltros = !periodo.noMesAtual
    || filtros.tipo !== FILTROS_INICIAIS.tipo
    || filtros.categoriaId !== FILTROS_INICIAIS.categoriaId
    || filtros.fonteDestinoId !== FILTROS_INICIAIS.fonteDestinoId;

  const mudarFiltros = (mudanca) => {
    setFiltros((atual) => {
      const novo = { ...atual, ...mudanca };
      if (mudanca.tipo && mudanca.tipo !== 'todos' && novo.categoriaId) {
        const categoria = opcoes.categorias.find((c) => String(c.id) === novo.categoriaId);
        if (categoria && categoria.tipo !== mudanca.tipo) novo.categoriaId = '';
      }
      return novo;
    });
    setPagina(1);
  };

  const mudarPeriodo = (ano, mes) => {
    periodo.definir(ano, mes);
    setPagina(1);
  };

  const limparFiltros = () => {
    setFiltros(FILTROS_INICIAIS);
    periodo.voltarAoAtual();
    setPagina(1);
  };

  const editar = (lancamento) => setSearchParams({ editar: String(lancamento.id) });
  const excluir = (lancamento) => setSearchParams({ excluir: String(lancamento.id) });

  const { dados, erro } = resultado;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-5">
        <BarraFiltros
          periodo={periodo}
          filtros={filtros}
          categorias={opcoes.categorias}
          fontes={opcoes.fontes}
          aoMudarPeriodo={mudarPeriodo}
          aoMudar={mudarFiltros}
          aoLimpar={limparFiltros}
        />
        {!carregando && dados && <TotaisPeriodo totais={dados.totais} />}
      </div>

      {opcoes.erro && (
        <MensagemErro
          mensagem="Não foi possível carregar as categorias e as fontes/destinos dos filtros."
          onTentarDeNovo={() => setVersaoOpcoes((v) => v + 1)}
        />
      )}

      {carregando && <Carregando linhas={8} />}

      {!carregando && erro && (
        <MensagemErro mensagem={erro} onTentarDeNovo={() => setVersao((v) => v + 1)} />
      )}

      {!carregando && dados && dados.itens.length === 0 && (
        <ListaVazia
          titulo="Nenhum lançamento neste período."
          acao={comFiltros ? { rotulo: 'Limpar filtros', onClick: limparFiltros } : undefined}
        />
      )}

      {!carregando && dados && dados.itens.length > 0 && (
        <TabelaLancamentos
          lancamentos={dados.itens}
          aoEditar={editar}
          aoExcluir={excluir}
          rodape={(
            <Paginacao
              pagina={dados.pagina}
              totalPaginas={dados.totalPaginas}
              total={dados.total}
              tamanhoPagina={TAMANHO_PAGINA}
              quantidade={dados.itens.length}
              unidade={['lançamento', 'lançamentos']}
              onChange={setPagina}
            />
          )}
        />
      )}
    </div>
  );
}
