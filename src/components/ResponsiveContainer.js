import React from 'react';
import { View, Platform } from 'react-native';
import { useResponsive } from '../hooks/useResponsive';

// 模擬手機的固定卡片尺寸（近似 iPhone 14/15 的邏輯解析度），
// 讓網頁版不受瀏覽器視窗高度影響，維持與 iOS 版一致的版面比例
const PHONE_CARD_WIDTH = 393;
const PHONE_CARD_HEIGHT = 852;

/**
 * 響應式容器組件
 * 在桌面版加入最大寬度限制，讓內容不會過寬
 */
export const ResponsiveContainer = ({ children, style, isDark = false }) => {
  const { isDesktop } = useResponsive();

  // Web 平台且桌面尺寸時的樣式
  if (Platform.OS === 'web' && isDesktop) {
    const pageBg = isDark ? '#121212' : '#f0f2f5';
    const cardBg = isDark ? '#1e1e1e' : '#ffffff';

    return (
      <View style={{
        flex: 1,
        backgroundColor: pageBg,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
      }}>
        <View style={[
          style,
          {
            width: PHONE_CARD_WIDTH,
            height: PHONE_CARD_HEIGHT,
            // 注意：不可用 `flex: 0`（RN 會展開成 flexBasis: '0%'，在直向 flex
            // 容器中會蓋過上面明確設定的 height，導致卡片實際渲染高度變成 0）。
            // 分開設定三個子屬性，flexBasis 用 'auto' 才會吃 height 的值。
            flexGrow: 0,
            flexShrink: 0,
            flexBasis: 'auto',
            backgroundColor: cardBg,
            // Web platform uses boxShadow instead of shadow* props
            ...(Platform.OS === 'web' ? {
              boxShadow: '0 0 20px rgba(0, 0, 0, 0.1)',
            } : {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.1,
              shadowRadius: 20,
              elevation: 5,
            }),
            marginVertical: 20,
            borderRadius: 12,
            overflow: 'hidden',
          },
        ]}>
          {children}
        </View>
      </View>
    );
  }
  
  // 手機/平板維持原樣
  return (
    <View style={[{ flex: 1 }, style]}>
      {children}
    </View>
  );
};
