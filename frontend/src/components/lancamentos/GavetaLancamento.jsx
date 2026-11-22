import { useEffect, useState } from 'react';
import api from '../../services/api';
import { mascararValor, valorDaMascara } from '../../utils/formatadores';
import { MAX_PARCELAS, calcularFatura, resumirParcelas } from '../../utils/parcelamento';
import { GRUPOS } from '../fontes-destinos/rotulos';
import { Button } from '../ui/button';
import { Campo } from '../ui/campo';
import { Carregando } from '../ui/carregando';
import { Dialogo } from '../ui/dialogo';
import { Gaveta } from '../ui/gaveta';
import { Input } from '../ui/input';
import { Segmentado } from '../ui/segmentado';
import { Select } from '../ui/select';

const TIPOS = [
  { valor: 'saida', rotulo: 'Saída' },
  { valor: 'entrada', rotulo: 'Entrada' },
];

const NOME_TIPO = { entrada: 'entrada', saida: 'saída' };
const DIGITOS_VALOR = 12;
const OPCOES_PARCELAS = Array.from({ length: MAX_PARCELAS }, (_, i) => i + 1);

function hoje() {
  const d = new Date();
  return [d.getFullYear(), d.getMonth() + 1, d.getDate()].map((n) => String(n).padStart(2, '0')).join('-');
}

function valoresIniciais(item) {
  if (!item) {
    return { tipo: 'saida', valor: '', descricao: '', data: hoje(), categoriaId: '', fonteDestinoId: '', parcelas: 1 };
  }
  return {
    tipo: item.tipo,
    valor: mascararValor(String(Math.round(item.valor * 100))),
    descricao: item.descricao,
    data: item.data,
    categoriaId: String(item.categoria.id),
    fonteDestinoId: String(item.fonteDestino.id),
    parcelas: item.total_parcelas,
  };
}

function validar(valores) {
  const erros = {};
  if (!valorDaMascara(valores.valor)) erros.valor = 'O valor deve ser maior que zero.';
  if (!valores.descricao.trim()) erros.descricao = 'Informe a descrição.';
  if (!valores.data) erros.data = 'Informe a data.';
  if (!valores.categoriaId) erros.categoriaId = 'Selecione uma categoria.';
  if (!valores.fonteDestinoId) erros.fonteDestinoId = 'Selecione uma fonte ou destino.';
  return erros;
}

function PreviaParcelas({ valor, parcelas, data, cartao }) {
  const fatura = data ? calcularFatura(data, { diaFechamento: cartao.dia_fechamento, diaVencimento: cartao.dia_vencimento }) : null;

  return (
    <div aria-live="polite" className="flex flex-col gap-1 rounded-sm bg-accent-soft p-3 text-primary">
      <p className="font-mono text-sm">{resumirParcelas(valor, parcelas)}</p>
      {fatura && (
        <p className="text-xs">1ª parcela na fatura de {fatura.referencia} · vence {fatura.vencimento}</p>
      )}
    </div>
  );
}

function Formulario({ item, categorias, fontes, aoCancelar, aoSalvar }) {
  const editando = Boolean(item);
  const parcelado = editando && item.total_parcelas > 1;
  const [iniciais] = useState(() => valoresIniciais(item));
  const [valores, setValores] = useState(iniciais);
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [avisoCategoria, setAvisoCategoria] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [confirmandoSaida, setConfirmandoSaida] = useState(false);

  const categoriasDoTipo = categorias.filter((c) => c.tipo === valores.tipo);
  const fonte = fontes.find((f) => String(f.id) === valores.fonteDestinoId);
  const cartao = fonte?.tipo === 'cartao_credito' ? fonte : null;
  const valorNumerico = valorDaMascara(valores.valor);
  const alterado = JSON.stringify(valores) !== JSON.stringify(iniciais);

  const mudar = (mudanca) => {
    setValores((atual) => ({ ...atual, ...mudanca }));
    setErros((atual) => {
      const novos = { ...atual };
      Object.keys(mudanca).forEach((campo) => delete novos[campo]);
      return novos;
    });
  };

  const mudarTipo = (tipo) => {
    if (tipo === valores.tipo) return;
    if (valores.categoriaId) setAvisoCategoria(`A categoria foi limpa porque não é de ${NOME_TIPO[tipo]}.`);
    mudar({ tipo, categoriaId: '' });
  };

  const mudarCategoria = (categoriaId) => {
    setAvisoCategoria('');
    mudar({ categoriaId });
  };

  const mudarFonte = (fonteDestinoId) => {
    const novaFonte = fontes.find((f) => String(f.id) === fonteDestinoId);
    const mudanca = { fonteDestinoId };
    if (!editando && novaFonte?.tipo !== 'cartao_credito') mudanca.parcelas = 1;
    mudar(mudanca);
  };

  const pedirFechamento = () => {
    if (salvando) return;
    if (alterado) setConfirmandoSaida(true);
    else aoCancelar();
  };

  async function enviar(e) {
    e.preventDefault();
    if (salvando) return;
    const invalidos = validar(valores);
    setErros(invalidos);
    setErroGeral('');
    if (Object.keys(invalidos).length) return;

    const corpo = {
      tipo: valores.tipo,
      valor: valorNumerico,
      descricao: valores.descricao.trim(),
      data: valores.data,
      categoriaId: Number(valores.categoriaId),
      fonteDestinoId: Number(valores.fonteDestinoId),
    };
    if (!editando && cartao) corpo.parcelas = valores.parcelas;

    setSalvando(true);
    try {
      if (editando) await api.put(`/lancamentos/${item.id}`, corpo);
      else await api.post('/lancamentos', corpo);
      aoSalvar();
    } catch (erro) {
      const dados = erro.response?.data;
      if (dados?.campos) setErros(dados.campos);
      else setErroGeral(dados?.erro ?? 'Não foi possível salvar. Tente novamente.');
      setSalvando(false);
    }
  }

  const teclar = (e) => {
    if (e.key === 'Enter' && e.target.tagName === 'SELECT') {
      e.preventDefault();
      e.currentTarget.requestSubmit();
    }
  };

  return (
    <>
      <Gaveta
        aberto
        aoFechar={pedirFechamento}
        bloqueada={salvando}
        aoEnviar={enviar}
        aoTeclar={teclar}
        titulo={editando ? 'Editar lançamento' : 'Novo lançamento'}
        rodape={(
          <>
            <Button variante="secondary" onClick={pedirFechamento} disabled={salvando}>Cancelar</Button>
            <Button type="submit" carregando={salvando}>Salvar</Button>
          </>
        )}
      >
        <Campo erro={erros.tipo}>
          {({ 'aria-describedby': descricaoId, 'aria-invalid': invalido }) => (
            <Segmentado
              rotulo="Tipo"
              opcoes={TIPOS}
              valor={valores.tipo}
              onChange={mudarTipo}
              cheio
              aria-describedby={descricaoId}
              aria-invalid={invalido}
            />
          )}
        </Campo>

        <Campo label="Valor" erro={erros.valor}>
          {({ id, ...aria }) => (
            <div className="flex h-16 items-center gap-2 rounded-sm border border-border-strong bg-surface px-4 font-mono text-2xl font-medium tracking-[-0.01em] focus-within:border-2 focus-within:border-primary focus-within:px-[15px] has-aria-invalid:border-2 has-aria-invalid:border-danger has-aria-invalid:px-[15px]">
              <span className={valores.valor ? 'text-text' : 'text-text-subtle'}>R$</span>
              <input
                id={id}
                {...aria}
                inputMode="numeric"
                autoComplete="off"
                placeholder="0,00"
                value={valores.valor}
                onChange={(e) => mudar({ valor: mascararValor(e.target.value.replace(/\D/g, '').slice(0, DIGITOS_VALOR)) })}
                data-autofocus
                className="min-w-0 flex-1 bg-transparent text-text placeholder:text-text-subtle focus:outline-none"
              />
            </div>
          )}
        </Campo>

        <Campo label="Descrição" erro={erros.descricao}>
          <Input value={valores.descricao} onChange={(e) => mudar({ descricao: e.target.value })} maxLength={120} />
        </Campo>

        <Campo label="Data" erro={erros.data}>
          <Input type="date" value={valores.data} onChange={(e) => mudar({ data: e.target.value })} />
        </Campo>

        <Campo label="Categoria" erro={erros.categoriaId} ajuda={avisoCategoria || undefined}>
          <Select value={valores.categoriaId} onChange={(e) => mudarCategoria(e.target.value)}>
            <option value="" disabled>Selecione</option>
            {categoriasDoTipo.map((c) => (
              <option key={c.id} value={String(c.id)}>{c.nome}</option>
            ))}
          </Select>
        </Campo>

        <Campo label="Fonte/destino" erro={erros.fonteDestinoId}>
          <Select value={valores.fonteDestinoId} onChange={(e) => mudarFonte(e.target.value)}>
            <option value="" disabled>Selecione</option>
            {GRUPOS.map((grupo) => {
              const itens = fontes.filter((f) => f.tipo === grupo.tipo);
              if (!itens.length) return null;
              return (
                <optgroup key={grupo.tipo} label={grupo.titulo}>
                  {itens.map((f) => <option key={f.id} value={String(f.id)}>{f.nome}</option>)}
                </optgroup>
              );
            })}
          </Select>
        </Campo>

        {cartao && !editando && (
          <Campo label="Parcelas" erro={erros.parcelas}>
            <Select value={valores.parcelas} onChange={(e) => mudar({ parcelas: Number(e.target.value) })}>
              {OPCOES_PARCELAS.map((n) => <option key={n} value={n}>{n}×</option>)}
            </Select>
          </Campo>
        )}

        {cartao && !editando && valorNumerico > 0 && (
          <PreviaParcelas valor={valorNumerico} parcelas={valores.parcelas} data={valores.data} cartao={cartao} />
        )}

        {parcelado && (
          <Campo label="Parcela" erro={erros.parcelas} ajuda="O número de parcelas não pode ser alterado.">
            <Input value={`${item.parcela_atual} de ${item.total_parcelas}`} disabled />
          </Campo>
        )}

        {erroGeral && <p role="alert" className="text-sm text-danger">{erroGeral}</p>}
      </Gaveta>

      <Dialogo
        aberto={confirmandoSaida}
        aoFechar={() => setConfirmandoSaida(false)}
        titulo="Descartar alterações?"
        acoes={(
          <>
            <Button variante="secondary" onClick={() => setConfirmandoSaida(false)} data-autofocus>Continuar editando</Button>
            <Button variante="danger" onClick={aoCancelar}>Descartar</Button>
          </>
        )}
      >
        <p className="text-sm text-text-muted">As informações preenchidas neste lançamento serão perdidas.</p>
      </Dialogo>
    </>
  );
}

function useLancamento(id) {
  const [estado, setEstado] = useState({ id: null, item: null, erro: '' });

  useEffect(() => {
    if (!id) return undefined;
    let ativo = true;
    api.get(`/lancamentos/${id}`)
      .then(({ data }) => { if (ativo) setEstado({ id, item: data, erro: '' }); })
      .catch((e) => {
        if (ativo) setEstado({ id, item: null, erro: e.response?.data?.erro ?? 'Não foi possível carregar o lançamento.' });
      });
    return () => { ativo = false; };
  }, [id]);

  return estado.id === id ? estado : { item: null, erro: '' };
}

export function GavetaLancamento({ id, categorias, fontes, aoCancelar, aoSalvar }) {
  const { item, erro } = useLancamento(id);

  if (id && !item) {
    return (
      <Gaveta aberto aoFechar={aoCancelar} titulo="Editar lançamento">
        {erro ? <p role="alert" className="text-sm text-danger">{erro}</p> : <Carregando linhas={6} />}
      </Gaveta>
    );
  }

  return <Formulario item={item} categorias={categorias} fontes={fontes} aoCancelar={aoCancelar} aoSalvar={aoSalvar} />;
}
