# TaskCal

A React Native (Expo) task management app with calendar view, Google SSO, Supabase backend, and iOS home screen widget. Supports English, Traditional Chinese, and Spanish.

**Current version:** v1.3.2 (Build 30)

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React Native 0.81.5 + Expo SDK 54 |
| Navigation | React Navigation (tabs + stack) |
| Backend | Supabase (Auth + PostgreSQL) |
| iOS Widget | Swift (App Group shared storage) |
| Analytics | Mixpanel (iOS) + Google Analytics 4 (Web) |
| Ads | Google AdMob |
| Web Deploy | Vercel |

## Project Structure

```
App.js                        # Entry point
src/
  components/                 # UI components
  services/                   # Business logic, API, widget sync
    widgetService.js           # Syncs data to iOS widget via Shared Group Preferences
  locales/                    # i18n strings (en, zh-TW, es)
  config/                     # App configuration
ios/
  TaskCalWidget/              # Swift widget extension
docs/                         # Setup guides (Supabase, Xcode)
```

## Development

```bash
npm install
npm start          # Expo dev server
```

iOS Widget changes require an Xcode build of the widget target. See `docs/` for Supabase and Xcode setup guides.

## Version History

### v1.3.2 — 2026-03-23
- Added Onboarding experience for new users
- Fixed theme resetting to light mode after login
- Fixed login page layout overflow and navigation errors
- Fixed web create/edit task page vertical scrollbar
- Save button changed to checkmark icon (fixes Spanish text overflow)
- Web header updated to shadow style
- Fixed last task hidden by gradient fade in task list
- Spanish translation fully synced

### v1.3.1 — 2026-03-15
- Ads temporarily paused (ad-free for all users)
- Settings screen background color polish
- Map preview text fully localized (en / zh-TW / es)
- Removed leftover debug code

### v1.2.9 — 2026-02-25
- Fixed FAB icon color in Light Mode
- Fixed tab bar dark flash on switch
- Added adaptive Light/Dark splash screen
- Unified brand color to `#6c63ff` across all UI

### v1.2.8 — 2026-02-09
- Fixed auto theme mode to follow iOS system appearance
- Real-time theme change detection
- Fixed Rate Us modal display

### v1.2.4
- In-app version update check with App Store link
- Google Maps URL preview inside task
- AdMob integration (calendar + settings screens)
- Optimized data preload order and parallel loading

---

## License

Private and proprietary. All rights reserved.
