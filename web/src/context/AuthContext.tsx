import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
}

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<{ devToken?: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

function loadState(): AuthState {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  if (token && userStr) {
    try {
      return { user: JSON.parse(userStr), token, loading: false };
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }
  return { user: null, token: null, loading: false };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(loadState);

  // 启动时验证 token 有效性
  useEffect(() => {
    if (!state.token) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${state.token}` } })
      .then((r) => {
        if (!r.ok) throw new Error('invalid');
        return r.json();
      })
      .then((data) => {
        setState({ user: data.user, token: state.token!, loading: false });
        localStorage.setItem('user', JSON.stringify(data.user));
      })
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setState({ user: null, token: null, loading: false });
      });
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const data = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      }).then((r) => r.json().then((d) => ({ ok: r.ok, data: d })));
      if (!data.ok) throw new Error(data.data.error);
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      setState({ user: data.data.user, token: data.data.token, loading: false });
    },
    []
  );

  const register = useCallback(
    async (username: string, email: string, password: string) => {
      const data = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      }).then((r) => r.json().then((d) => ({ ok: r.ok, data: d })));
      if (!data.ok) throw new Error(data.data.error);
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      setState({ user: data.data.user, token: data.data.token, loading: false });
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setState({ user: null, token: null, loading: false });
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data as { devToken?: string };
  }, []);

  const resetPassword = useCallback(async (token: string, newPassword: string) => {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        forgotPassword,
        resetPassword,
        isAdmin: state.user?.role === 'admin',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
