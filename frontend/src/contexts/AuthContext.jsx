import { createContext, useContext, useEffect, useState } from 'react';
import api, { TOKEN_KEY, definirAoNaoAutorizado } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [carregando, setCarregando] = useState(Boolean(token));

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUsuario(null);
  };

  useEffect(() => { definirAoNaoAutorizado(logout); }, []);

  useEffect(() => {
    if (!token) { setCarregando(false); return; }
    api.get('/auth/me')
      .then((res) => setUsuario(res.data))
      .catch(() => {})
      .finally(() => setCarregando(false));
  }, [token]);

  const login = async (email, senha) => {
    const { data } = await api.post('/auth/login', { email, senha });
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUsuario(data.usuario);
  };

  const cadastrar = (dados) => api.post('/auth/cadastro', dados);

  return (
    <AuthContext.Provider value={{ usuario, token, carregando, login, logout, cadastrar }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
