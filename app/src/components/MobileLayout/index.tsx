import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Avatar, Badge, Typography } from 'antd';
import { TabBar } from 'antd-mobile';
import {
  AppOutline,
  UnorderedListOutline,
  SetOutline,
  TeamOutline,
} from 'antd-mobile-icons';
import { useAuth } from '../../context/AuthContext';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

const { Text } = Typography;

const tabs = [
  { key: '/', icon: <AppOutline />, title: '看板' },
  { key: '/alerts', icon: <UnorderedListOutline />, title: '告警' },
  { key: '/device', icon: <SetOutline />, title: '设备' },
  { key: '/guardians', icon: <TeamOutline />, title: '守护' },
];

export default function MobileLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const isOnline = useNetworkStatus();

  const currentKey = location.pathname === '/' ? '/' : '/' + location.pathname.split('/')[1];
  const authPaths = ['/login', '/register', '/forgot-password'];
  const isAuthPage = authPaths.some(p => location.pathname.startsWith(p));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#F5F0EC' }}>
      {/* 顶部 Header */}
      {!isAuthPage && (
        <div style={{
          background: '#fff',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #E8E0D8',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar
              size={32}
              style={{ backgroundColor: '#E8725A', fontSize: 14 }}
            >安</Avatar>
            <div>
              <Text strong style={{ fontSize: 15 }}>行动安全守护</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 11 }}>
                {user?.username || '未登录'}
              </Text>
            </div>
          </div>
          <Badge dot={!isOnline} color="#E05555">
            <Text
              type="secondary"
              style={{ fontSize: 12, cursor: 'pointer' }}
              onClick={() => { logout(); navigate('/login', { replace: true }); }}
            >
              退出
            </Text>
          </Badge>
        </div>
      )}

      {/* 离线提示 */}
      {!isOnline && !isAuthPage && (
        <div className="offline-banner">当前处于离线模式，部分功能不可用</div>
      )}

      {/* 主要内容 */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 12px 0' }}>
        <Outlet />
      </div>

      {/* 底部 Tab 导航 */}
      {!isAuthPage && (
        <div style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <TabBar
            activeKey={currentKey}
            onChange={(key: string) => navigate(key)}
            style={{ background: '#fff', borderTop: '1px solid #E8E0D8' }}
          >
            {tabs.map(tab => (
              <TabBar.Item key={tab.key} icon={tab.icon} title={tab.title} />
            ))}
          </TabBar>
        </div>
      )}
    </div>
  );
}
