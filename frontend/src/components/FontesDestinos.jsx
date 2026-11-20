import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { DialogoConfirmarExclusao, DialogoExclusaoBloqueada } from './fontes-destinos/DialogosExclusao';
import { GavetaFonte } from './fontes-destinos/GavetaFonte';
import { GrupoFontes } from './fontes-destinos/GrupoFontes';
import { GRUPOS } from './fontes-destinos/rotulos';
import { Carregando } from './ui/carregando';
import { MensagemErro } from './ui/mensagem-erro';

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

  const fecharGaveta = () => {
    setEditando(null);
    if (criando) setSearchParams({}, { replace: true });
  };

  const aoSalvar = () => {
    fecharGaveta();
    recarregar();
  };

  const pedirExclusao = (item) => {
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
        item={paraExcluir}
        aoCancelar={() => setParaExcluir(null)}
        aoConfirmar={confirmarExclusao}
        excluindo={excluindo}
        erro={erroExclusao}
      />
      <DialogoExclusaoBloqueada mensagem={bloqueio} aoFechar={() => setBloqueio('')} />
    </>
  );
}
