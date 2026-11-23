import { idValido } from '../utils/id.js';

export const exigirIdValido = (naoEncontrado) => (req, res, next) => {
  const id = idValido(req.params.id);
  if (!id) return res.status(404).json(naoEncontrado);
  req.idRecurso = id;
  return next();
};
