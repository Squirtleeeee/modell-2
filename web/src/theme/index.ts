import type { ThemeConfig } from 'antd';

// UI/UX Pro Max — Warm Coral + Calm Teal palette for mobility care
const theme: ThemeConfig = {
  token: {
    // Primary: warm coral — compassion, urgency, human warmth
    colorPrimary: '#E8725A',
    // Secondary: calm teal — health, safety, reassurance
    colorSuccess: '#4DB6AC',
    colorWarning: '#F0A04B',
    colorError: '#E05555',
    colorInfo: '#4DB6AC',

    // Neutral warm grays
    colorTextBase: '#3D322C',
    colorTextSecondary: '#8B7E74',
    colorBgLayout: '#F5F0EC',
    colorBgContainer: '#FFFFFF',
    colorBorder: '#E8E0D8',

    // Accessible sizing — larger defaults for elderly family members
    fontSize: 15,
    fontSizeHeading1: 28,
    fontSizeHeading2: 22,
    fontSizeHeading3: 18,
    borderRadius: 8,
    controlHeight: 38,
  },
  components: {
    Menu: {
      itemBg: 'transparent',
      subMenuItemBg: 'transparent',
      activeBarWidth: 3,
    },
    Card: {
      paddingLG: 24,
    },
    Table: {
      headerBg: '#FAF6F2',
    },
    Button: {
      controlHeight: 38,
      paddingContentHorizontal: 20,
    },
  },
};

export default theme;
