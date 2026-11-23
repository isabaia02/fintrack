import axios from 'axios';

export const TOKEN_KEY = 'fintrack_token';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let aoNaoAutorizado = () => {};
export const definirAoNaoAutorizado = (fn) => { aoNaoAutorizado = fn; };

export function tipoDaFalha(erro) {
  if (axios.isCancel(erro)) return null;
  if (!erro.response) return 'sem-conexao';
  const { status } = erro.response;
  if (status === 404) return 'nao-encontrado';
  if (status >= 500) return 'erro-servidor';
  return null;
}

const enviouToken =(erro) => Boolean(erro.config?.headers?.Authorization);

api.interceptors.response.use(
  (res) => res,
  (erro) => {
    if (erro.response?.status === 401 && enviouToken(erro)) aoNaoAutorizado(erro);
    return Promise.reject(erro);
  },
);

export default api;
