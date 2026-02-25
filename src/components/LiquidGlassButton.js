import React from 'react';
import { requireNativeComponent, Platform, Text, TouchableOpacity, NativeModules } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

let NativeButton = null;

if (Platform.OS === 'ios') {
  if (NativeModules.LiquidGlassButtonViewManager) {
    try {
      NativeButton = requireNativeComponent('LiquidGlassButtonView');
    } catch (e) {
      NativeButton = null;
    }
  }
}

const SF_SYMBOL_TO_ICON = {
  'chevron.left': 'chevron-left',
  'checkmark': 'check',
  'xmark': 'close',
};

export default function LiquidGlassButton({ style, buttonIcon, buttonLabel, primaryColor, onPress }) {
  if (NativeButton) {
    return (
      <NativeButton
        style={style}
        buttonIcon={buttonIcon || ""}
        buttonLabel={buttonLabel || ""}
        primaryColor={primaryColor}
        onPress={onPress}
      />
    );
  }

  // Fallback: plain button with semi-transparent background
  const iconName = SF_SYMBOL_TO_ICON[buttonIcon];
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        {
          backgroundColor: 'rgba(120,120,128,0.16)',
          borderRadius: 22,
          justifyContent: 'center',
          // alignItems: center causes Yoga to compute width=0 for absolute-positioned label buttons
          ...(iconName ? { alignItems: 'center' } : {}),
        },
        style,
      ]}
    >
      {iconName ? (
        <MaterialCommunityIcons name={iconName} size={22} color={primaryColor} />
      ) : (
        <Text style={{ color: primaryColor, fontWeight: '600', fontSize: 15, paddingHorizontal: 14 }}>
          {buttonLabel}
        </Text>
      )}
    </TouchableOpacity>
  );
}
