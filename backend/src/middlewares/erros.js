export function naoEncontrado(req, res) {
  res.status(404).json({ erro: 'Rota não encontrada.' });
}

export function tratarErros(erro, req, res, next) {
  if (erro.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido.' });
  }
  console.error(erro);
  res.status(500).json({ erro: 'Erro interno do servidor.' });
}
