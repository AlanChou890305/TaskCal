import { requireNativeComponent, Platform } from 'react-native';

const LiquidGlassFABButton = Platform.OS === 'ios'
  ? requireNativeComponent('LiquidGlassFABView')
  : null;

export default LiquidGlassFABButton;
