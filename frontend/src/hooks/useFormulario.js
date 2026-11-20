import { useState } from 'react';

export function useFormulario({ valoresIniciais, validar, aoEnviar, mensagemPadrao }) {
  const [valores, setValores] = useState(valoresIniciais);
  const [erros, setErros] = useState({});
  const [erroServidor, setErroServidor] = useState('');
  const [enviando, setEnviando] = useState(false);

  const alterar = (campo, formatar = (texto) => texto) => (evento) => {
    setValores((atual) => ({ ...atual, [campo]: formatar(evento.target.value) }));
    setErros((atual) => ({ ...atual, [campo]: undefined }));
  };

  const enviar = async (evento) => {
    evento.preventDefault();
    const encontrados = validar(valores);
    setErros(encontrados);
    if (Object.keys(encontrados).length) return;

    setEnviando(true);
    setErroServidor('');
    try {
      await aoEnviar(valores);
    } catch (erro) {
      const dados = erro.response?.data;
      if (dados?.campos) setErros(dados.campos);
      else setErroServidor(dados?.erro ?? mensagemPadrao);
    } finally {
      setEnviando(false);
    }
  };

  return { valores, erros, erroServidor, enviando, alterar, enviar };
}
