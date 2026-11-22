import { useState } from 'react';
import api from '../../services/api';
import { mascararValor, valorDaMascara } from '../../utils/formatadores';
import { Button } from '../ui/button';
import { Campo } from '../ui/campo';
import { Gaveta } from '../ui/gaveta';
import { Input } from '../ui/input';
import { Segmentado } from '../ui/segmentado';
import { TIPOS } from './rotulos';

// NUMERIC(12, 2): no máximo 12 dígitos (9.999.999.999,99), o mesmo teto da API.
const DIGITOS_LIMITE = 12;
const apenasDigitos =(texto) => texto.replace(/\D/g, '').slice(0, 2);
const diaValido = (texto) => texto !== '' && Number(texto) >= 1 && Number(texto) <= 31;
const centavos = (valor) => mascararValor(String(Math.round(valor * 100)));

function Formulario({ item, aoCancelar, aoSalvar }) {
  const editando = Boolean(item);
  const [tipo, setTipo] = useState(item?.tipo ?? 'cartao_credito');
  const [nome, setNome] = useState(item?.nome ?? '');
  const [diaFechamento, setDiaFechamento] = useState(item?.dia_fechamento?.toString() ?? '');
  const [diaVencimento, setDiaVencimento] = useState(item?.dia_vencimento?.toString() ?? '');
  const [limite, setLimite] = useState(item?.limite ? centavos(item.limite) : '');
  const [reserva, setReserva] = useState(item?.reserva ?? false);
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [salvando, setSalvando] = useState(false);
  const tipoTravado = editando && item.total_lancamentos > 0;
  const cartao = tipo === 'cartao_credito';

  function validar() {
    const novos = {};
    if (!nome.trim()) novos.nome = 'Informe o nome.';
    if (cartao) {
      if (!diaValido(diaFechamento)) novos.dia_fechamento = 'Informe um dia entre 1 e 31.';
      if (!diaValido(diaVencimento)) novos.dia_vencimento = 'Informe um dia entre 1 e 31.';
      if (!valorDaMascara(limite)) novos.limite = 'Informe o limite do cartão.';
    }
    return novos;
  }

  async function enviar(e) {
    e.preventDefault();
    const invalidos = validar();
    setErros(invalidos);
    setErroGeral('');
    if (Object.keys(invalidos).length) return;

    const corpo = { nome: nome.trim(), tipo };
    if (cartao) {
      corpo.dia_fechamento = Number(diaFechamento);
      corpo.dia_vencimento = Number(diaVencimento);
      corpo.limite = valorDaMascara(limite);
    }
    if (tipo === 'conta') corpo.reserva = reserva;

    setSalvando(true);
    try {
      if (editando) await api.put(`/fontes-destinos/${item.id}`, corpo);
      else await api.post('/fontes-destinos', corpo);
      aoSalvar();
    } catch (erro) {
      const dados = erro.response?.data;
      if (dados?.campos) setErros(dados.campos);
      else setErroGeral(dados?.erro ?? 'Não foi possível salvar. Tente novamente.');
      setSalvando(false);
    }
  }

  return (
    <Gaveta
      aberto
      aoFechar={aoCancelar}
      bloqueada={salvando}
      aoEnviar={enviar}
      titulo={editando ? 'Editar fonte ou destino' : 'Nova fonte ou destino'}
      rodape={(
        <>
          <Button variante="secondary" onClick={aoCancelar} disabled={salvando}>Cancelar</Button>
          <Button type="submit" carregando={salvando}>Salvar</Button>
        </>
      )}
    >
      <Campo
        ajuda={tipoTravado ? 'O tipo não pode mudar enquanto houver lançamentos.' : undefined}
        erro={erros.tipo}
      >
        {({ 'aria-describedby': descricaoId, 'aria-invalid': invalido }) => (
          <Segmentado
            rotulo="Tipo"
            opcoes={TIPOS}
            valor={tipo}
            onChange={setTipo}
            cheio
            desabilitado={tipoTravado}
            aria-describedby={descricaoId}
            aria-invalid={invalido}
          />
        )}
      </Campo>

      <Campo label="Nome" erro={erros.nome}>
        <Input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={60} data-autofocus />
      </Campo>

      {cartao && (
        <>
          <div className="flex items-start gap-3">
            <Campo label="Dia de fechamento" ajuda="Entre 1 e 31." erro={erros.dia_fechamento} className="min-w-0 flex-1">
              <Input
                inputMode="numeric"
                value={diaFechamento}
                onChange={(e) => setDiaFechamento(apenasDigitos(e.target.value))}
              />
            </Campo>
            <Campo label="Dia de vencimento" ajuda="Entre 1 e 31." erro={erros.dia_vencimento} className="min-w-0 flex-1">
              <Input
                inputMode="numeric"
                value={diaVencimento}
                onChange={(e) => setDiaVencimento(apenasDigitos(e.target.value))}
              />
            </Campo>
          </div>
          <Campo label="Limite (R$)" erro={erros.limite}>
            <Input
              inputMode="numeric"
              value={limite}
              onChange={(e) => setLimite(mascararValor(e.target.value.replace(/\D/g, '').slice(0, DIGITOS_LIMITE)))}
              placeholder="0,00"
            />
          </Campo>
        </>
      )}

      {tipo === 'conta' && (
        <Campo label="Reserva" erro={erros.reserva}>
          {({ id }) => (
            <label htmlFor={id} className="flex items-center gap-2 text-sm">
              <input
                id={id}
                type="checkbox"
                checked={reserva}
                onChange={(e) => setReserva(e.target.checked)}
                className="size-4 accent-primary"
              />
              Conta de reserva de emergência
            </label>
          )}
        </Campo>
      )}

      {erroGeral && <p role="alert" className="text-sm text-danger">{erroGeral}</p>}
    </Gaveta>
  );
}

export function GavetaFonte({ aberto, item, aoCancelar, aoSalvar }) {
  if (!aberto) return null;
  return <Formulario item={item} aoCancelar={aoCancelar} aoSalvar={aoSalvar} />;
}
