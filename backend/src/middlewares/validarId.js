import { idValido } from '../utils/id.js';

export const exigirIdValido = (naoEncontrado) => (req, res, next) => {
  if (!idValido(req.params.id)) return res.status(404).json(naoEncontrado);
  return next();
};
