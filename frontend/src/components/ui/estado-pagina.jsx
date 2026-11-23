import Icone from '../Icone';
import { Button } from './button';

const ESTADOS = {
  'nao-encontrado': {
    icone: 'search',
    tom: 'bg-accent-soft text-primary',
    titulo: 'Não encontramos o que você procurou',
    frase: 'A página não existe ou o item foi removido. Isso também acontece com itens que não são da sua conta.',
    acoes: ['voltar'],
  },
  'erro-servidor': {
    icone: 'error',
    tom: 'bg-danger-soft text-danger',
    titulo: 'Algo deu errado do nosso lado',
    frase: 'Já estamos cuidando disso. Seus dados estão seguros. Tente de novo em instantes.',
    acoes: ['tentar', 'voltar'],
  },
  'sem-conexao': {
    icone: 'warning',
    tom: 'bg-warning-soft text-warning',
    titulo: 'Você está sem conexão',
    frase: 'Verifique sua internet. Seus lançamentos aparecem de novo assim que a conexão voltar.',
    acoes: ['tentar'],
  },
};

export function EstadoPagina({ tipo, onTentarDeNovo, onVoltarAoResumo }) {
  const { icone, tom, titulo, frase, acoes } = ESTADOS[tipo];
  const botoes = {
    tentar: { rotulo: 'Tentar de novo', onClick: onTentarDeNovo },
    voltar: { rotulo: 'Voltar ao resumo', onClick: onVoltarAoResumo },
  };

  return (
    <section
      role={tipo === 'nao-encontrado' ? undefined : 'alert'}
      className="flex flex-1 flex-col items-center justify-center gap-5 p-12 text-center"
    >
      <div className={`flex size-16 items-center justify-center rounded-full ${tom}`}>
        <Icone nome={icone} tamanho={32} />
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <h1>{titulo}</h1>
        <p className="max-w-[420px] text-sm text-text-muted">{frase}</p>
      </div>
      <div className="flex gap-3">
        {acoes.map((acao, i) => (
          <Button key={acao} variante={i === 0 ? 'primary' : 'secondary'} onClick={botoes[acao].onClick}>
            {botoes[acao].rotulo}
          </Button>
        ))}
      </div>
    </section>
  );
}
