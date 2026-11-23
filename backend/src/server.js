import 'dotenv/config';
import { criarApp } from './app.js';
import { validarAmbiente } from './config/ambiente.js';

const { origens, avisos } = validarAmbiente();
avisos.forEach((aviso) => console.warn(`[aviso] ${aviso}`));

const app = criarApp({ origens });
const porta = process.env.PORT ?? 3000;
app.listen(porta, () => console.log(`API rodando em http://localhost:${porta}`));
