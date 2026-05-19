import { HashRouter, Routes, Route } from 'react-router-dom';
import { ConfigProvider, App as AntApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import theme from './theme';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Alerts from './pages/Alerts';
import Device from './pages/Device';
import Guardians from './pages/Guardians';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';

export default function App() {
  return (
    <ConfigProvider theme={theme} locale={zhCN}>
      <AntApp>
        <AuthProvider>
          <HashRouter>
            <Routes>
              {/* 公开页面 — 无需登录 */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />

              {/* 受保护页面 — 需要登录 */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="alerts" element={<Alerts />} />
                <Route path="device" element={<Device />} />
                <Route path="guardians" element={<Guardians />} />
              </Route>
            </Routes>
          </HashRouter>
        </AuthProvider>
      </AntApp>
    </ConfigProvider>
  );
}
