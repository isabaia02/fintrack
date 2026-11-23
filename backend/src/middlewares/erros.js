export function naoEncontrado(req, res) {
  res.status(404).json({ erro: 'Rota não encontrada.' });
}

const ERROS_DE_CORPO = {
  'entity.parse.failed': [400, 'JSON inválido.'],
  'entity.too.large': [413, 'O corpo da requisição é grande demais.'],
  'encoding.unsupported': [415, 'Codificação não suportada.'],
  'charset.unsupported': [415, 'Codificação não suportada.'],
  'request.aborted': [400, 'Requisição interrompida.'],
};

export function tratarErros(erro, req, res, next) {
  const conhecido = ERROS_DE_CORPO[erro.type];
  if (conhecido) return res.status(conhecido[0]).json({ erro: conhecido[1] });
  console.error(erro);
  return res.status(500).json({ erro: 'Erro interno do servidor.' });
}
