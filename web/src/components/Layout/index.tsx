import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout as AntLayout, Menu, Badge, Avatar, Dropdown, Typography, Tag, Button, Drawer } from 'antd';
import {
  DashboardOutlined,
  AlertOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
  LogoutOutlined,
  BellOutlined,
  CrownOutlined,
  MenuOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { useIsMobile } from '../../hooks/useMediaQuery';

const { Sider, Header, Content } = AntLayout;
const { Text } = Typography;

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: '数据看板' },
  { key: '/alerts', icon: <AlertOutlined />, label: '报警记录' },
  { key: '/device', icon: <SettingOutlined />, label: '设备管理' },
  { key: '/guardians', icon: <TeamOutlined />, label: '监护人管理' },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [unreadAlerts] = useState(1);
  const isMobile = useIsMobile();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const userMenu = {
    items: [
      {
        key: 'profile',
        icon: <UserOutlined />,
        label: (
          <div>
            <Text strong>{user?.username}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>{user?.email}</Text>
          </div>
        ),
        disabled: true,
      },
      { type: 'divider' as const },
      ...(isAdmin
        ? [{ key: 'admin', icon: <CrownOutlined />, label: `角色: ${user?.role === 'admin' ? '管理员' : '家属'}` }]
        : []),
      { type: 'divider' as const },
      { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true },
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === 'logout') handleLogout();
    },
  };

  const sidebarContent = (
    <>
      <div
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Text strong style={{ color: '#fff', fontSize: isMobile ? 16 : 18, letterSpacing: 1 }}>
          行动安全守护系统
        </Text>
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={({ key }) => { navigate(key); setDrawerOpen(false); }}
        style={{ background: 'transparent', borderInlineEnd: 'none', marginTop: 8 }}
      />
    </>
  );

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      {/* 桌面端侧边栏 */}
      {!isMobile && (
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          style={{
            background: 'linear-gradient(180deg, #3D322C 0%, #5C4A3E 100%)',
          }}
          theme="dark"
          width={220}
        >
          <div
            style={{
              height: 64,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {collapsed ? (
              <BellOutlined style={{ fontSize: 24, color: '#E8725A' }} />
            ) : (
              <Text strong style={{ color: '#fff', fontSize: 18, letterSpacing: 1 }}>
                行动安全守护系统
              </Text>
            )}
          </div>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            style={{ background: 'transparent', borderInlineEnd: 'none', marginTop: 8 }}
          />
        </Sider>
      )}

      {/* 移动端抽屉菜单 */}
      {isMobile && (
        <Drawer
          placement="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width={220}
          styles={{
            body: { padding: 0, background: 'linear-gradient(180deg, #3D322C 0%, #5C4A3E 100%)' },
            header: { background: 'linear-gradient(180deg, #3D322C 0%, #5C4A3E 100%)', borderBottom: '1px solid rgba(255,255,255,0.08)' },
          }}
          title={<Text strong style={{ color: '#fff', fontSize: 16 }}>行动安全守护系统</Text>}
          closeIcon={<CloseOutlined style={{ color: '#fff' }} />}
        >
          {sidebarContent}
        </Drawer>
      )}

      <AntLayout>
        <Header
          style={{
            background: '#fff',
            padding: isMobile ? '0 12px' : '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            borderBottom: '1px solid #E8E0D8',
            height: 64,
          }}
        >
          {isMobile && (
            <Button
              type="text"
              icon={<MenuOutlined style={{ fontSize: 20, color: '#3D322C' }} />}
              onClick={() => setDrawerOpen(true)}
              style={{ marginRight: 'auto' }}
            />
          )}
          {isAdmin && (
            <Tag color="gold" style={{ marginRight: 12 }} icon={<CrownOutlined />}>
              {isMobile ? '' : '管理员'}
            </Tag>
          )}
          <Badge count={unreadAlerts} size="small" offset={[-2, 2]}>
            <BellOutlined
              style={{ fontSize: 18, marginRight: isMobile ? 12 : 24, cursor: 'pointer' }}
              onClick={() => navigate('/alerts')}
            />
          </Badge>
          <Dropdown menu={userMenu} placement="bottomRight">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <Avatar size={32} icon={<UserOutlined />} style={{ backgroundColor: '#E8725A' }} />
              {!isMobile && <Text strong>{user?.username || '家属'}</Text>}
            </div>
          </Dropdown>
        </Header>

        <Content style={{ margin: isMobile ? 12 : 24 }}>
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  );
}
