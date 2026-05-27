import type { ThemeConfig } from 'antd';

const theme: ThemeConfig = {
  token: {
    colorPrimary: '#E8725A',
    colorSuccess: '#4DB6AC',
    colorWarning: '#F0A04B',
    colorError: '#E05555',
    colorInfo: '#4DB6AC',
    colorTextBase: '#3D322C',
    colorTextSecondary: '#8B7E74',
    colorBgBase: '#FFFFFF',
    colorBgLayout: '#F5F0EC',
    colorBorder: '#E8E0D8',
    fontSize: 15,
    fontSizeHeading1: 26,
    fontSizeHeading2: 22,
    fontSizeHeading3: 18,
    borderRadius: 10,
    controlHeight: 38,
    fontFamily: "'Noto Sans SC', 'PingFang SC', sans-serif",
  },
  components: {
    Card: {
      borderRadiusLG: 10,
      paddingLG: 16,
    },
    Button: {
      controlHeight: 40,
      borderRadius: 8,
    },
  },
};

export default theme;
