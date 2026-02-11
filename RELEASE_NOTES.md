# Release Notes - Version 1.2.8 (Build 16)

**Release Date**: 2026-02-09

---

## What's New

### English
- Fixed auto theme mode to properly follow iOS system appearance settings
- Added real-time system theme change detection for instant updates
- Improved theme detection logic with better fallback mechanism
- Fixed Rate Us modal to ensure proper display
- Enhanced app stability and user experience

### 繁體中文
- 修正自動主題模式以正確跟隨 iOS 系統外觀設定
- 新增即時系統主題變化偵測，即時更新
- 改善主題偵測邏輯與備用機制
- 修正評分彈窗確保正確顯示
- 增強應用程式穩定性與使用者體驗

### Español
- Corregido modo de tema automático para seguir correctamente la configuración de apariencia del sistema iOS
- Añadida detección de cambios de tema del sistema en tiempo real para actualizaciones instantáneas
- Mejorada lógica de detección de tema con mejor mecanismo de respaldo
- Corregido modal de valoración para asegurar visualización correcta
- Mayor estabilidad de la aplicación y experiencia de usuario

---

## Promotional Text (App Store)

### English
Experience seamless dark mode! Now auto theme perfectly follows your iOS system settings with instant updates. Enjoy a more polished and responsive interface that adapts to your preferences automatically.

### 繁體中文
體驗無縫深色模式！現在自動主題完美跟隨您的 iOS 系統設定並即時更新。享受更精緻且即時回應的介面，自動適應您的偏好設定。

### Español
¡Experimenta el modo oscuro sin interrupciones! Ahora el tema automático sigue perfectamente la configuración de tu sistema iOS con actualizaciones instantáneas. Disfruta de una interfaz más pulida y receptiva que se adapta automáticamente a tus preferencias.

---

## Keywords

task management, todo list, productivity, calendar widget, iOS widget, task organizer, daily planner, time management, reminder app, task tracker, dark mode, theme customization

---

## Technical Details

### Fixed Issues
- **Auto Theme Detection**: Fixed `userInterfaceStyle` setting from "Light" to "Automatic" in app.config.js and Info.plist
- **Appearance API Integration**: Added Appearance API for reliable iOS system theme detection
- **Real-time Theme Updates**: Implemented system theme change listener for instant response to iOS settings
- **Fallback Mechanism**: Improved auto mode with proper fallback (useColorScheme → Appearance.getColorScheme → light)
- **Rate Us Modal**: Fixed modal display logic to ensure proper fallback behavior

### Impact
- **Before**: Auto theme mode always showed light theme regardless of iOS dark mode setting
- **After**: Auto theme correctly follows iOS system appearance with instant updates

---

## Release Checklist

- [ ] Version numbers updated in all 9 locations
- [ ] RELEASE_NOTES.md updated
- [ ] README.md version information updated
- [ ] App tested on simulator
- [ ] Widget tested and working
- [ ] Auto theme tested with iOS Light/Dark mode switching
- [ ] Xcode Archive successful
- [ ] App Store Connect submission ready

---

## Migration Notes

No migration required. This release includes bug fixes and improvements with no breaking changes or data structure modifications.
