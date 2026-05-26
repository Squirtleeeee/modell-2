import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

interface User {
  id: number;
  username: string;
  email: string;
  phone: string | null;
  role: string;
  email_verified: boolean;
  phone_verified: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
}

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  loginByPhonePassword: (phone: string, password: string) => Promise<void>;
  loginBySms: (phone: string, code: string) => Promise<void>;
  register: (username: string, email: string, password: string, emailCode: string, phone?: string) => Promise<void>;
  logout: () => void;
  sendEmailCode: (email: string, purpose: 'register' | 'reset_password') => Promise<void>;
  sendSmsCode: (phone: string, purpose: 'register' | 'login' | 'reset_password') => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

function normalizeUser(raw: Record<string, unknown>): User {
  return {
    id: raw.id as number,
    username: raw.username as string,
    email: raw.email as string,
    phone: (raw.phone as string) || null,
    role: (raw.role as string) || 'family',
    email_verified: Boolean(raw.email_verified),
    phone_verified: Boolean(raw.phone_verified),
  };
}

function loadState(): AuthState {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  if (token && userStr) {
    try {
      return { user: normalizeUser(JSON.parse(userStr)), token, loading: true };
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }
  return { user: null, token: null, loading: false };
}

const getServerUrl = () => localStorage.getItem('server_url') || '';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(loadState);

  useEffect(() => {
    if (!state.token) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    const server = getServerUrl();
    if (!server) {
      setState({ user: null, token: null, loading: false });
      return;
    }
    fetch(`${server}/api/auth/me`, { headers: { Authorization: `Bearer ${state.token}` } })
      .then((r) => {
        if (!r.ok) throw new Error('invalid');
        return r.json();
      })
      .then((data) => {
        const user = normalizeUser(data.user);
        setState({ user, token: state.token!, loading: false });
        localStorage.setItem('user', JSON.stringify(user));
      })
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setState({ user: null, token: null, loading: false });
      });
  }, []);

  const saveAuth = useCallback((token: string, user: User) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setState({ user, token, loading: false });
  }, []);

  const api = useCallback(async (url: string, body: Record<string, unknown>) => {
    const server = getServerUrl();
    if (!server) throw new Error('请先点击右上角齿轮图标配置服务器地址');
    const res = await fetch(`${server}${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  }, []);

  // 用户名+密码登录
  const login = useCallback(
    async (username: string, password: string) => {
      const data = await api('/api/auth/login', { username, password });
      saveAuth(data.token, normalizeUser(data.user));
    },
    [api, saveAuth]
  );

  // 手机号+密码登录
  const loginByPhonePassword = useCallback(
    async (phone: string, password: string) => {
      const data = await api('/api/auth/login', { username: phone, password, loginType: 'phone_password' });
      saveAuth(data.token, normalizeUser(data.user));
    },
    [api, saveAuth]
  );

  // 手机号+短信验证码登录
  const loginBySms = useCallback(
    async (phone: string, code: string) => {
      const data = await api('/api/auth/login-by-sms', { phone, code });
      saveAuth(data.token, normalizeUser(data.user));
    },
    [api, saveAuth]
  );

  // 注册
  const register = useCallback(
    async (username: string, email: string, password: string, emailCode: string, phone?: string) => {
      const data = await api('/api/auth/register', { username, email, password, emailCode, phone });
      saveAuth(data.token, normalizeUser(data.user));
    },
    [api, saveAuth]
  );

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setState({ user: null, token: null, loading: false });
  }, []);

  // 发送邮箱验证码
  const sendEmailCode = useCallback(
    async (email: string, purpose: 'register' | 'reset_password') => {
      await api('/api/auth/send-email-code', { email, purpose });
    },
    [api]
  );

  // 发送短信验证码
  const sendSmsCode = useCallback(
    async (phone: string, purpose: 'register' | 'login' | 'reset_password') => {
      await api('/api/auth/send-sms-code', { phone, purpose });
    },
    [api]
  );

  // 忘记密码 — 发送验证码
  const forgotPassword = useCallback(
    async (email: string) => {
      await api('/api/auth/forgot-password', { email });
    },
    [api]
  );

  // 重置密码
  const resetPassword = useCallback(
    async (email: string, code: string, newPassword: string) => {
      await api('/api/auth/reset-password', { email, code, newPassword });
    },
    [api]
  );

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        loginByPhonePassword,
        loginBySms,
        register,
        logout,
        sendEmailCode,
        sendSmsCode,
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
