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

api.interceptors.response.use(
  (res) => res,
  (erro) => {
    if (erro.response?.status === 401) aoNaoAutorizado(erro);
    return Promise.reject(erro);
  },
);

export default api;
