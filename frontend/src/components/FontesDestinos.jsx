import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { GavetaFonte } from './fontes-destinos/GavetaFonte';
import { GrupoFontes } from './fontes-destinos/GrupoFontes';
import { GRUPOS, mensagemExclusaoBloqueada } from './fontes-destinos/rotulos';
import { Carregando } from './ui/carregando';
import { DialogoConfirmarExclusao, DialogoExclusaoBloqueada } from './ui/dialogo-exclusao';
import { MensagemErro } from './ui/mensagem-erro';
import { lerResultado } from '../utils/resultados';

const porId = (lista, campo) => new Map(lista.map((item) => [item.id, item[campo]]));

async function carregarValores() {
  const [fontes, faturas] = await Promise.allSettled([
    api.get('/relatorios/fontes-destinos'),
    api.get('/relatorios/faturas', { params: { meses: 0 } }),
  ]);
  return {
    renda: lerResultado(fontes, (d) => porId(d.entradas.fontes, 'total')),
    conta: lerResultado(fontes, (d) => porId(d.contas, 'saldo')),
    cartao_credito: lerResultado(faturas, (d) => porId(d.cartoes, 'limite_utilizado')),
  };
}

export default function FontesDestinos() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [editando, setEditando] = useState(null);
  const [paraExcluir, setParaExcluir] = useState(null);
  const [erroExclusao, setErroExclusao] = useState('');
  const [excluindo, setExcluindo] = useState(false);
  const [bloqueio, setBloqueio] = useState('');
  const [valores, setValores] = useState({});

  const criando = searchParams.get('novo') === '1';
  const gaveta = editando ? { item: editando } : criando ? { item: null } : null;

  const [versao, setVersao] = useState(0);
  const recarregar = () => setVersao((v) => v + 1);

  useEffect(() => {
    let ativo = true;
    api.get('/fontes-destinos')
      .then(({ data }) => {
        if (!ativo) return;
        setItens(data);
        setErro('');
      })
      .catch((e) => {
        if (ativo) setErro(e.response?.data?.erro ?? 'Não foi possível carregar as fontes e destinos.');
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => { ativo = false; };
  }, [versao]);

  useEffect(() => {
    let ativo = true;
    carregarValores().then((resultado) => {
      if (ativo) setValores(resultado);
    });
    return () => { ativo = false; };
  }, [versao]);

  const fecharGaveta = () => {
    setEditando(null);
    if (criando) setSearchParams({}, { replace: true });
  };

  const aoSalvar = () => {
    fecharGaveta();
    recarregar();
  };

  const pedirExclusao = (item) => {
    if (item.total_lancamentos > 0) {
      setBloqueio(mensagemExclusaoBloqueada(item.total_lancamentos));
      return;
    }
    setErroExclusao('');
    setParaExcluir(item);
  };

  async function confirmarExclusao() {
    setExcluindo(true);
    setErroExclusao('');
    try {
      await api.delete(`/fontes-destinos/${paraExcluir.id}`);
      setParaExcluir(null);
      recarregar();
    } catch (e) {
      const { status, data } = e.response ?? {};
      if (status === 409) {
        setParaExcluir(null);
        setBloqueio(data.erro);
      } else if (status === 404) {
        setParaExcluir(null);
        recarregar();
      } else {
        setErroExclusao(data?.erro ?? 'Não foi possível excluir. Tente novamente.');
      }
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <>
      {carregando && <Carregando linhas={5} />}

      {!carregando && erro && (
        <MensagemErro mensagem={erro} onTentarDeNovo={() => { setCarregando(true); recarregar(); }} />
      )}

      {!carregando && !erro && (
        <div className="flex flex-col gap-8">
          {GRUPOS.map((grupo) => (
            <GrupoFontes
              key={grupo.tipo}
              grupo={grupo}
              itens={itens.filter((i) => i.tipo === grupo.tipo)}
              valores={valores[grupo.tipo]}
              aoEditar={setEditando}
              aoExcluir={pedirExclusao}
            />
          ))}
        </div>
      )}

      <GavetaFonte
        aberto={Boolean(gaveta)}
        item={gaveta?.item}
        aoCancelar={fecharGaveta}
        aoSalvar={aoSalvar}
      />
      <DialogoConfirmarExclusao
        aberto={Boolean(paraExcluir)}
        titulo="Excluir fonte ou destino?"
        aoCancelar={() => setParaExcluir(null)}
        aoConfirmar={confirmarExclusao}
        excluindo={excluindo}
        erro={erroExclusao}
      >
        O item <strong>{paraExcluir?.nome}</strong> será excluído. Esta ação não pode ser desfeita.
      </DialogoConfirmarExclusao>
      <DialogoExclusaoBloqueada mensagem={bloqueio} aoFechar={() => setBloqueio('')} />
    </>
  );
}
