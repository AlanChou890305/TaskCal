# Release Notes - Version 1.2.9 (Build 17)

**Release Date**: 2026-02-25

---

## What's New

### English
- Fixed theme color to correctly use the app's signature purple (#6c63ff) across all UI
- Fixed iOS Widget primary color to match the app theme
- Improved internal code quality and performance
- Reduced unnecessary debug logs for better performance

### 繁體中文
- 修正主題色，所有 UI 統一使用應用程式標誌性紫色 (#6c63ff)
- 修正 iOS Widget 主色與應用程式主題一致
- 改善內部程式碼品質與效能
- 減少不必要的除錯日誌以提升效能

### Español
- Corregido color del tema para usar correctamente el morado característico de la app (#6c63ff) en toda la interfaz
- Corregido color principal del widget de iOS para que coincida con el tema de la app
- Mejorada la calidad del código interno y el rendimiento
- Reducidos los registros de depuración innecesarios para mejor rendimiento

---

## Promotional Text (App Store)

### English
Enjoy a more polished and consistent experience! Theme colors are now perfectly unified across the app and iOS widget, with improved performance under the hood.

### 繁體中文
享受更精緻一致的使用體驗！主題顏色現在在應用程式與 iOS Widget 之間完美統一，底層效能也同步提升。

### Español
¡Disfruta de una experiencia más refinada y consistente! Los colores del tema ahora están perfectamente unificados en la app y el widget de iOS, con mejoras de rendimiento internas.

---

## Keywords

task management, todo list, productivity, calendar widget, iOS widget, task organizer, daily planner, time management, reminder app, task tracker, dark mode, theme customization

---

## Technical Details

### Fixed Issues
- **Theme Color Refactor**: Introduced `PRIMARY`, `PRIMARY_LIGHT`, `PRIMARY_DARK` constants in `theme.js` as single source of truth for brand color `#6c63ff`
- **Widget Color Mismatch**: Fixed Widget `primaryColor` from `#9E59FA` to `#6c63ff` to match app theme
- **Shimmer Token**: Added `shimmer` to theme for consistent skeleton loading colors (replaces inline ternaries)
- **App Group Restored**: Restored App Group entitlement (`group.com.cty0305.too.doo.list.data`) that was accidentally removed
- **Hardcoded Colors Eliminated**: Replaced all 48 occurrences of `#3B82F6` across CalendarScreen, SettingScreen, notificationConfig, notificationService with `PRIMARY` or `theme.primary`
- **Console.log Cleanup**: Removed verbose/redundant logs in App.js (210 → 153)

---

## Release Checklist

- [ ] Version numbers updated in all 9 locations
- [ ] RELEASE_NOTES.md updated
- [ ] README.md version information updated
- [ ] App tested on simulator
- [ ] Widget tested and working
- [ ] Theme color verified on light/dark mode
- [ ] Xcode Archive successful
- [ ] App Store Connect submission ready

---

## Migration Notes

No migration required. This release includes bug fixes and code quality improvements with no breaking changes or data structure modifications.
