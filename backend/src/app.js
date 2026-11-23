import express from 'express';
import cors from 'cors';
import rotas from './routes/index.js';
import { cabecalhosSeguranca } from './middlewares/cabecalhosSeguranca.js';
import { naoEncontrado, tratarErros } from './middlewares/erros.js';

const LIMITE_CORPO = '100kb';

export function criarApp({ origens }) {
  const app = express();

  app.disable('x-powered-by');

  if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);

  app.use(cabecalhosSeguranca);
  app.use(cors({
    origin: (origem, retorno) => retorno(null, !origem || origens.includes(origem)),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    maxAge: 600,
  }));
  app.use(express.json({ limit: LIMITE_CORPO }));

  app.use('/api', rotas);

  app.use(naoEncontrado);
  app.use(tratarErros);
  return app;
}
