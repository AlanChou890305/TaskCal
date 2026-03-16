import { Platform } from 'react-native';

export const isWeb = Platform.OS === 'web';
export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';

const iosVersion = Platform.OS === 'ios' ? parseInt(Platform.Version, 10) : 0;

export const isIOS26Plus = iosVersion >= 26;
export const isIOS26Below = isIOS && iosVersion < 26;
