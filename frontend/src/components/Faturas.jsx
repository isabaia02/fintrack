import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { FaturaBloco } from './faturas/FaturaBloco';
import { LimiteCartao } from './faturas/LimiteCartao';
import { Carregando } from './ui/carregando';
import { ListaVazia } from './ui/lista-vazia';
import { MensagemErro } from './ui/mensagem-erro';
import { Segmentado } from './ui/segmentado';

const MESES_A_FRENTE = 3; 

export default function Faturas() {
  const navigate = useNavigate();
  const [cartoes, setCartoes] = useState(null);
  const [erro, setErro] = useState('');
  const [selecionado, setSelecionado] = useState(null);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let ativo = true;
    api.get('/relatorios/faturas', { params: { meses: MESES_A_FRENTE } })
      .then(({ data }) => {
        if (!ativo) return;
        setCartoes(data.cartoes);
        setErro('');
      })
      .catch((e) => {
        if (!ativo) return;
        setErro(e.response?.data?.erro ?? 'Não foi possível carregar as faturas.');
        setCartoes(null);
      });
    return () => { ativo = false; };
  }, [versao]);

  const tentarDeNovo = () => {
    setErro('');
    setCartoes(null);
    setVersao((v) => v + 1);
  };

  if (erro) return <MensagemErro mensagem={erro} onTentarDeNovo={tentarDeNovo} />;
  if (!cartoes) return <Carregando linhas={5} />;

  if (cartoes.length === 0) {
    return (
      <ListaVazia
        titulo="Nenhum cartão de crédito cadastrado"
        frase="Cadastre um cartão em Fontes e destinos para acompanhar o limite e as faturas."
        acao={{ rotulo: 'Cadastrar cartão', onClick: () => navigate('/fontes-destinos?novo=1') }}
      />
    );
  }

  const cartao = cartoes.find((c) => c.id === selecionado) ?? cartoes[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <Segmentado
          rotulo="Cartão"
          opcoes={cartoes.map((c) => ({ valor: c.id, rotulo: c.nome }))}
          valor={cartao.id}
          onChange={setSelecionado}
        />
        <span className="text-sm font-medium text-text-muted">Faturas futuras</span>
      </div>

      <LimiteCartao cartao={cartao} />

      <hr className="h-px border-0 bg-border" />

      <section aria-labelledby="titulo-faturas" className="flex flex-col gap-3">
        <h2 id="titulo-faturas">Fatura atual e próximas</h2>
        {cartao.faturas.map((fatura, i) => (
          <FaturaBloco key={`${cartao.id}-${fatura.referencia}`} fatura={fatura} inicialmenteAberta={i < 2} />
        ))}
      </section>
    </div>
  );
}
