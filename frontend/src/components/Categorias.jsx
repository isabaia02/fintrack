import { useEffect, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { Carregando } from './ui/carregando';
import { MensagemErro } from './ui/mensagem-erro';
import { PainelCategorias } from './categorias/PainelCategorias';
import { DialogoCategoria } from './categorias/DialogoCategoria';
import { DialogoConfirmarExclusao, DialogoExclusaoBloqueada } from './ui/dialogo-exclusao';

export default function Categorias() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { mostrarErro } = useOutletContext();
  const [categorias, setCategorias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [editando, setEditando] = useState(null);
  const [paraExcluir, setParaExcluir] = useState(null);
  const [erroExclusao, setErroExclusao] = useState('');
  const [excluindo, setExcluindo] = useState(false);
  const [bloqueio, setBloqueio] = useState('');

  const criando = searchParams.get('novo') === '1';
  const formulario = editando ? { categoria: editando } : criando ? { categoria: null } : null;

  const [versao, setVersao] = useState(0);
  const recarregar = () => setVersao((v) => v + 1);

  useEffect(() => {
    let ativo = true;
    api.get('/categorias')
      .then(({ data }) => {
        if (!ativo) return;
        setCategorias(data);
        setErro('');
      })
      .catch((e) => {
        if (ativo && !mostrarErro(e)) setErro(e.response?.data?.erro ?? 'Não foi possível carregar as categorias.');
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => { ativo = false; };
  }, [versao, mostrarErro]);

  const fecharFormulario = () => {
    setEditando(null);
    if (criando) setSearchParams({}, { replace: true });
  };

  const aoSalvar = () => {
    fecharFormulario();
    recarregar();
  };

  async function confirmarExclusao() {
    setExcluindo(true);
    setErroExclusao('');
    try {
      await api.delete(`/categorias/${paraExcluir.id}`);
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

  const pedirExclusao = (categoria) => {
    setErroExclusao('');
    setParaExcluir(categoria);
  };

  const saidas = categorias.filter((c) => c.tipo === 'saida');
  const entradas = categorias.filter((c) => c.tipo === 'entrada');

  return (
    <>
      {carregando && <Carregando linhas={5} />}

      {!carregando && erro && (
        <MensagemErro
          mensagem={erro}
          onTentarDeNovo={() => { setCarregando(true); recarregar(); }}
        />
      )}

      {!carregando && !erro && (
        <div className="flex flex-col items-start gap-6 lg:flex-row">
          <PainelCategorias
            titulo="Saídas"
            categorias={saidas}
            mensagemVazia="Nenhuma categoria de saída. Crie a primeira em “Nova categoria”."
            aoEditar={setEditando}
            aoExcluir={pedirExclusao}
          />
          <PainelCategorias
            titulo="Entradas"
            categorias={entradas}
            mensagemVazia="Nenhuma categoria de entrada. Crie a primeira em “Nova categoria”."
            aoEditar={setEditando}
            aoExcluir={pedirExclusao}
          />
        </div>
      )}

      <DialogoCategoria
        aberto={Boolean(formulario)}
        categoria={formulario?.categoria}
        aoCancelar={fecharFormulario}
        aoSalvar={aoSalvar}
      />
      <DialogoConfirmarExclusao
        aberto={Boolean(paraExcluir)}
        titulo="Excluir categoria?"
        aoCancelar={() => setParaExcluir(null)}
        aoConfirmar={confirmarExclusao}
        excluindo={excluindo}
        erro={erroExclusao}
      >
        A categoria <strong>{paraExcluir?.nome}</strong> será excluída. Esta ação não pode ser desfeita.
      </DialogoConfirmarExclusao>
      <DialogoExclusaoBloqueada mensagem={bloqueio} aoFechar={() => setBloqueio('')} />
    </>
  );
}
