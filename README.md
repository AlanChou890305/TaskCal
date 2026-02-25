# TaskCal

一個跨平台的 React Native 待辦事項應用程式，整合了日曆視圖、Google SSO 登入、Supabase 後端，並支援多語言介面（英文與繁體中文）。

## ✨ 特色功能

### 核心功能

- **📅 日曆視圖：** 點選日期即可查看、新增、編輯或移動任務
- **🎯 任務管理：** 輕鬆新增、編輯、刪除和移動任務
- **🔗 URL 連結：** 為任務附加連結，快速存取相關資源
- **⏰ 時間追蹤：** 可選的時間欄位，用於任務排程
- **✅ 任務完成：** 一鍵標記任務為完成

### 使用者體驗

- **🎨 現代化 UI：** 簡潔設計，搭配 Material Icons 與圓角風格
- **🌍 多語言支援：** 英文與繁體中文（台灣）
- **🔐 Google SSO 驗證：** 使用 Google OAuth 安全登入
- **☁️ 雲端儲存：** 任務與使用者設定皆儲存於 Supabase
- **👤 個人化設定：** 根據使用者資料提供個人化體驗
- **⚙️ 設定選項：** 切換語言、查看版本、使用條款與隱私權政策
- **📊 數據分析：** Google Analytics 4 (Web) + Mixpanel (iOS) 使用者行為分析
- **🚀 網頁部署：** 針對 Vercel 部署進行最佳化
- **📱 iOS 主畫面小工具：** 在主畫面直接查看今日任務（午夜自動更新）
- **⚡ 效能優化：** 更快的任務操作與小工具更新速度

## 📁 專案結構

### 核心檔案

- `App.js` - 主要應用程式元件
- `src/` - 原始碼目錄
  - `components/` - React 元件
  - `services/` - API 與商業邏輯
  - `config/` - 設定檔
- `supabase_migration_*.sql` - 資料庫遷移檔案
- `supabaseClient.js` - Supabase 客戶端設定

### 文件

- `README.md` - 本檔案（繁體中文 / English）
- `docs/` - 設定指南與技術文件
  - `SUPABASE_*.md` - Supabase 設定
  - `XCODE_*.md` - iOS/Xcode 設定
  - `archive/` - 封存的指南

## 應用程式截圖

### 淺色模式

|                               截圖 1                                |                               截圖 2                                |                               截圖 3                                |
| :-----------------------------------------------------------------: | :-----------------------------------------------------------------: | :-----------------------------------------------------------------: |
| <img src="docs/screenshots/ToDo - 待辦清單截圖1.jpg" width="200" /> | <img src="docs/screenshots/ToDo - 待辦清單截圖2.jpg" width="200" /> | <img src="docs/screenshots/ToDo - 待辦清單截圖3.jpg" width="200" /> |

### 深色模式

|                               截圖 5                                |                               截圖 6                                |                               截圖 7                                |
| :-----------------------------------------------------------------: | :-----------------------------------------------------------------: | :-----------------------------------------------------------------: |
| <img src="docs/screenshots/ToDo - 待辦清單截圖5.jpg" width="200" /> | <img src="docs/screenshots/ToDo - 待辦清單截圖6.jpg" width="200" /> | <img src="docs/screenshots/ToDo - 待辦清單截圖7.jpg" width="200" /> |

## 📱 使用說明

### 任務管理

- **新增任務：** 點擊「+」按鈕或日曆上的日期
- **編輯任務：** 點擊任何任務以修改標題、連結或時間
- **完成任務：** 點擊核取方塊標記為完成
- **刪除任務：** 在編輯模式中使用刪除按鈕
- **關閉視窗：** 使用 X 按鈕或點擊視窗外部

### 設定

- **切換語言：** 在英文、繁體中文與西班牙文之間切換
- **查看版本：** 確認目前應用程式版本 (v1.2.9)
- **法律資訊：** 查看使用條款與隱私權政策
- **登出：** 安全登出並立即返回登入畫面

## 🛠️ 技術堆疊

### 前端

- **React Native** (Expo) - 跨平台框架
- **React Navigation** - 頁籤與堆疊導航
- **react-native-calendars** - 日曆 UI 元件
- **react-native-svg** - SVG 圖形渲染
- **Material Icons** - 圖示庫

### 後端與服務

- **Supabase** - 身份驗證與 PostgreSQL 資料庫
- **Supabase Edge Functions** - 無伺服器函式
- **Google OAuth 2.0** - SSO 單一登入
- **Google Analytics 4 (react-ga4)** - 網頁使用分析
- **Mixpanel (mixpanel-react-native)** - iOS 分析
- **Vercel** - 網頁部署平台

### 版本管理

- **語意化版本 (Semantic Versioning)** - Major.Minor.Patch (目前 v1.2.9)
- **npm scripts** - version:patch, version:minor, version:major

## 📝 版本資訊

### v1.2.9 (最新版本) - 2026-02-25

**UI 修正與體驗優化 (Build 25)**

- 🎨 **修正 FAB 圖示顏色**：LiquidGlass FAB 按鈕在 Light Mode 下正確顯示主題色
- ✨ **修正 Tab 切換閃爍**：切換底部分頁時不再短暫閃現深色外觀
- 🖼️ **自適應啟動畫面**：新增 Light / Dark 版本啟動畫面
- 🔧 **修正主題色**：所有 UI 統一使用應用程式標誌性紫色 (#6c63ff)

---

### v1.2.8 - 2026-02-09

**自動主題模式修正與改進**

- 🎨 **修正自動主題模式**：正確跟隨 iOS 系統外觀設定（Light/Dark Mode）
- ⚡ **即時主題偵測**：新增系統主題變化監聽，即時響應 iOS 設定
- 🔧 **改善偵測邏輯**：優化主題偵測機制與 fallback 處理
- 💬 **修正評分彈窗**：確保 Rate Us 模組正確顯示
- ✨ **增強使用者體驗**：提升應用程式穩定性與介面流暢度

---

### v1.2.4 (舊版本)

**本版新增**

- 📲 **應用程式內版本更新**：App 會檢查是否有新版本，並提示您前往 App Store 更新
- 🗺️ **任務地圖預覽**：當任務連結為 Google 地圖網址時，可在 App 內開啟地圖預覽
- 📢 **廣告支援**：為持續維護與開發，日曆與設定畫面底部加入輕量廣告，不影響主要操作

**效能與改進**

- ⚡ **更快的載入**：優化資料預載順序（今日任務 → 當月 → 前後月）
- 🚀 **並行載入**：用戶設定與任務並行載入，啟動更快速
- 📝 **智能 Note 輸入**：Note 欄位隨輸入自動擴展（最多 12 行），編輯更順手
- 💾 **立即緩存**：預載資料在畫面間重複使用，減少重複請求

## 🤝 貢獻

歡迎貢獻！請提交 Issue 或 Pull Request 來回報錯誤或建議新功能。

## 📄 授權

本專案為私有專案，版權所有。未經授權不得使用、複製或分發。

---

**TaskCal** - 專注於直覺任務管理與日曆介面的 MVP。  
如有回饋或功能請求，請在 GitHub 上開啟 Issue！

---

# TaskCal

A cross-platform React Native task management application with calendar view, Google SSO authentication, Supabase backend, and multi-language support (English and Traditional Chinese).

## ✨ Features

### Core Features

- **📅 Calendar View:** Click on any date to view, add, edit, or move tasks
- **🎯 Task Management:** Easily add, edit, delete, and move tasks
- **🔗 URL Links:** Attach links to tasks for quick access to related resources
- **⏰ Time Tracking:** Optional time field for task scheduling
- **✅ Task Completion:** Mark tasks as complete with one tap

### User Experience

- **🎨 Modern UI:** Clean design with Material Icons and rounded corners
- **🌍 Multi-language Support:** English and Traditional Chinese (Taiwan)
- **🔐 Google SSO Authentication:** Secure login with Google OAuth
- **☁️ Cloud Storage:** Tasks and user settings stored in Supabase
- **👤 Personalized Settings:** Personalized experience based on user data
- **⚙️ Settings Options:** Switch language, view version, terms of use and privacy policy
- **📊 Data Analytics:** Google Analytics 4 (Web) + Mixpanel (iOS) user behavior analysis
- **🚀 Web Deployment:** Optimized for Vercel deployment
- **📱 iOS Home Screen Widget:** View today's tasks directly on the home screen (auto-updates at midnight)
- **⚡ Performance Optimization:** Faster task operations and widget update speeds

## 📁 Project Structure

### Core Files

- `App.js` - Main application component
- `src/` - Source code directory
  - `components/` - React components
  - `services/` - API and business logic
  - `config/` - Configuration files
- `supabase_migration_*.sql` - Database migration files
- `supabaseClient.js` - Supabase client configuration

### Documentation

- `README.md` - This file (Traditional Chinese / English)
- `docs/` - Setup guides and technical documentation
  - `SUPABASE_*.md` - Supabase configuration
  - `XCODE_*.md` - iOS/Xcode configuration
  - `archive/` - Archived guides

## Application Screenshots

### Light Mode

|                            Screenshot 1                             |                            Screenshot 2                             |                            Screenshot 3                             |
| :-----------------------------------------------------------------: | :-----------------------------------------------------------------: | :-----------------------------------------------------------------: |
| <img src="docs/screenshots/ToDo - 待辦清單截圖1.jpg" width="200" /> | <img src="docs/screenshots/ToDo - 待辦清單截圖2.jpg" width="200" /> | <img src="docs/screenshots/ToDo - 待辦清單截圖3.jpg" width="200" /> |

### Dark Mode

|                            Screenshot 5                             |                            Screenshot 6                             |                            Screenshot 7                             |
| :-----------------------------------------------------------------: | :-----------------------------------------------------------------: | :-----------------------------------------------------------------: |
| <img src="docs/screenshots/ToDo - 待辦清單截圖5.jpg" width="200" /> | <img src="docs/screenshots/ToDo - 待辦清單截圖6.jpg" width="200" /> | <img src="docs/screenshots/ToDo - 待辦清單截圖7.jpg" width="200" /> |

## 📱 Usage Instructions

### Task Management

- **Add Task:** Click the "+" button or click on a date in the calendar
- **Edit Task:** Click any task to modify title, link, or time
- **Complete Task:** Click the checkbox to mark as complete
- **Delete Task:** Use the delete button in edit mode
- **Close Window:** Use the X button or click outside the window

### Settings

- **Switch Language:** Toggle between English, Traditional Chinese, and Spanish
- **View Version:** Check current application version (v1.2.9)
- **Legal Information:** View terms of use and privacy policy
- **Sign Out:** Securely sign out and return to login screen

## 🛠️ Tech Stack

### Frontend

- **React Native** (Expo) - Cross-platform framework
- **React Navigation** - Tab and stack navigation
- **react-native-calendars** - Calendar UI component
- **react-native-svg** - SVG graphics rendering
- **Material Icons** - Icon library

### Backend & Services

- **Supabase** - Authentication and PostgreSQL database
- **Supabase Edge Functions** - Serverless functions
- **Google OAuth 2.0** - SSO single sign-on
- **Google Analytics 4 (react-ga4)** - Web usage analytics
- **Mixpanel (mixpanel-react-native)** - iOS analytics
- **Vercel** - Web deployment platform

### Version Management

- **Semantic Versioning** - Major.Minor.Patch (Current: v1.2.9)
- **npm scripts** - version:patch, version:minor, version:major

## 📝 Version Information

### v1.2.9 (Latest) - 2026-02-25

**UI Fixes & Experience Improvements (Build 25)**

- 🎨 **Fixed FAB Icon Color**: LiquidGlass FAB button now correctly shows theme color in Light Mode
- ✨ **Fixed Tab Switching Flicker**: Bottom tab bar no longer briefly flashes dark appearance
- 🖼️ **Adaptive Splash Screen**: Added Light/Dark splash screen variants
- 🔧 **Fixed Theme Color**: All UI consistently uses the app's signature purple (#6c63ff)

---

### v1.2.8 - 2026-02-09

**Auto Theme Mode Fix & Improvements**

- 🎨 **Fixed Auto Theme Mode**: Now properly follows iOS system appearance settings (Light/Dark Mode)
- ⚡ **Real-time Theme Detection**: Added system theme change listener for instant response
- 🔧 **Improved Detection Logic**: Enhanced theme detection mechanism with better fallback handling
- 💬 **Fixed Rate Us Modal**: Ensured proper display of Rate Us module
- ✨ **Enhanced User Experience**: Improved app stability and interface smoothness

---

### v1.2.4

**New in This Version**

- 📲 **In-App Version Update**: The app now checks for new versions and prompts you to update with a direct link to the App Store
- 🗺️ **Map Preview for Tasks**: When a task link is a Google Maps URL, you can open an in-app map preview
- 📢 **Ad Support**: Light ads have been added to support continued development; they appear at the bottom of the calendar and settings screens and do not block core features

**Performance & Improvements**

- ⚡ **Faster Loading**: Optimized data preloading with priority loading order (today's tasks → current month → adjacent months)
- 🚀 **Parallel Loading**: User settings and tasks load in parallel for quicker startup
- 📝 **Smart Note Input**: Note field expands as you type (up to 12 lines) for easier editing
- 💾 **Immediate Caching**: Preloaded data is reused across screens to reduce duplicate requests

## 🤝 Contributing

Contributions are welcome! Please submit Issues or Pull Requests to report bugs or suggest new features.

## 📄 License

This project is private and proprietary. All rights reserved. Unauthorized use, copying, or distribution is prohibited.

---

**TaskCal** - An MVP focused on intuitive task management with calendar interface.  
For feedback or feature requests, please open an Issue on GitHub!

---

# TaskCal

Una aplicación multiplataforma de gestión de tareas React Native con vista de calendario, autenticación Google SSO, backend Supabase y soporte multiidioma (Inglés, Chino Tradicional y Español).

## ✨ Características

### Funciones Principales

- **📅 Vista de Calendario:** Haz clic en cualquier fecha para ver, agregar, editar o mover tareas
- **🎯 Gestión de Tareas:** Agrega, edita, elimina y mueve tareas fácilmente
- **🔗 Enlaces URL:** Adjunta enlaces a las tareas para acceso rápido a recursos relacionados
- **⏰ Seguimiento de Tiempo:** Campo de tiempo opcional para programar tareas
- **✅ Finalización de Tareas:** Marca las tareas como completadas con un toque

### Experiencia de Usuario

- **🎨 UI Moderna:** Diseño limpio con Material Icons y esquinas redondeadas
- **🌍 Soporte Multiidioma:** Inglés, Chino Tradicional (Taiwán) y Español
- **🔐 Autenticación Google SSO:** Inicio de sesión seguro con Google OAuth
- **☁️ Almacenamiento en la Nube:** Tareas y configuraciones de usuario almacenadas en Supabase
- **👤 Configuraciones Personalizadas:** Experiencia personalizada basada en datos del usuario
- **⚙️ Opciones de Configuración:** Cambiar idioma, ver versión, términos de uso y política de privacidad
- **📊 Análisis de Datos:** Google Analytics 4 (Web) + Mixpanel (iOS) análisis de comportamiento del usuario
- **🚀 Despliegue Web:** Optimizado para despliegue en Vercel
- **📱 Widget de Pantalla de Inicio iOS:** Ve tus tareas diarias directamente en la pantalla de inicio (se actualiza automáticamente a medianoche)
- **⚡ Optimización de Rendimiento:** Operaciones de tareas más rápidas y velocidades de actualización del widget

## 📁 Estructura del Proyecto

### Archivos Principales

- `App.js` - Componente principal de la aplicación
- `src/` - Directorio de código fuente
  - `components/` - Componentes React
  - `services/` - API y lógica de negocio
  - `config/` - Archivos de configuración
- `supabase_migration_*.sql` - Archivos de migración de base de datos
- `supabaseClient.js` - Configuración del cliente Supabase

### Documentación

- `README.md` - Este archivo (Chino Tradicional / English / Español)
- `docs/` - Guías de configuración y documentación técnica
  - `SUPABASE_*.md` - Configuración de Supabase
  - `XCODE_*.md` - Configuración de iOS/Xcode
  - `archive/` - Guías archivadas

## 📱 Instrucciones de Uso

### Gestión de Tareas

- **Agregar Tarea:** Haz clic en el botón "+" o en una fecha del calendario
- **Editar Tarea:** Haz clic en cualquier tarea para modificar título, enlace o hora
- **Completar Tarea:** Haz clic en la casilla para marcar como completada
- **Eliminar Tarea:** Usa el botón de eliminar en modo de edición
- **Cerrar Ventana:** Usa el botón X o haz clic fuera de la ventana

### Configuración

- **Cambiar Idioma:** Alterna entre Inglés, Chino Tradicional y Español
- **Ver Versión:** Verifica la versión actual de la aplicación (v1.2.9)
- **Información Legal:** Ver términos de uso y política de privacidad
- **Cerrar Sesión:** Cierra sesión de forma segura y regresa a la pantalla de inicio de sesión

## 🛠️ Stack Tecnológico

### Frontend

- **React Native** (Expo) - Framework multiplataforma
- **React Navigation** - Navegación por pestañas y pila
- **react-native-calendars** - Componente UI de calendario
- **react-native-svg** - Renderizado de gráficos SVG
- **Material Icons** - Biblioteca de iconos

### Backend y Servicios

- **Supabase** - Autenticación y base de datos PostgreSQL
- **Supabase Edge Functions** - Funciones sin servidor
- **Google OAuth 2.0** - SSO inicio de sesión único
- **Google Analytics 4 (react-ga4)** - Análisis de uso web
- **Mixpanel (mixpanel-react-native)** - Análisis iOS
- **Vercel** - Plataforma de despliegue web

### Gestión de Versiones

- **Versionado Semántico** - Major.Minor.Patch (Actual: v1.2.9)
- **npm scripts** - version:patch, version:minor, version:major

## 📝 Información de Versión

### v1.2.9 (Última) - 2026-02-25

**Unificación de Color del Tema y Calidad de Código**

- 🎨 **Corregido Color del Tema**: Toda la interfaz usa ahora el morado característico de la app (#6c63ff)
- 📱 **Corregido Color del Widget**: El color del widget de iOS ahora coincide con el tema de la app
- 🔧 **Constantes de Color**: Introducida constante PRIMARY como fuente única del color de marca
- ✨ **Mejora de Código**: Eliminados valores de color hardcodeados dispersos en el código
- ⚡ **Rendimiento**: Reducidos logs de depuración innecesarios

---

### v1.2.8 - 2026-02-09

**Corrección y Mejoras del Modo de Tema Automático**

- 🎨 **Corregido Modo de Tema Automático**: Ahora sigue correctamente la configuración de apariencia del sistema iOS (Modo Claro/Oscuro)
- ⚡ **Detección de Tema en Tiempo Real**: Añadido listener de cambios de tema del sistema para respuesta instantánea
- 🔧 **Lógica de Detección Mejorada**: Mecanismo de detección de tema mejorado con mejor manejo de respaldo
- 💬 **Corregido Modal de Valoración**: Asegurada visualización correcta del módulo Rate Us
- ✨ **Experiencia de Usuario Mejorada**: Mejora en la estabilidad de la aplicación y fluidez de la interfaz

---

### v1.2.4

**Novedades de esta versión**

- 📲 **Actualización dentro de la app**: La app comprueba si hay nueva versión y te avisa con enlace directo a App Store
- 🗺️ **Vista previa de mapa en tareas**: Si el enlace de una tarea es de Google Maps, puedes abrir una vista previa del mapa dentro de la app
- 📢 **Soporte de anuncios**: Se han añadido anuncios ligeros para mantener el desarrollo; aparecen al pie del calendario y de Ajustes sin bloquear las funciones principales

**Rendimiento y mejoras**

- ⚡ **Carga más rápida**: Precarga optimizada con orden de prioridad (tareas de hoy → mes actual → meses adyacentes)
- 🚀 **Carga paralela**: Ajustes y tareas se cargan en paralelo para un arranque más rápido
- 📝 **Entrada inteligente de notas**: El campo de notas se expande al escribir (hasta 12 líneas) para editar con más comodidad
- 💾 **Caché inmediata**: Los datos precargados se reutilizan entre pantallas para reducir solicitudes duplicadas

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Por favor envía Issues o Pull Requests para reportar errores o sugerir nuevas funciones.

## 📄 Licencia

Este proyecto es privado y propietario. Todos los derechos reservados. El uso, copia o distribución no autorizados están prohibidos.

---

**TaskCal** - Un MVP enfocado en gestión intuitiva de tareas con interfaz de calendario.  
¡Para comentarios o solicitudes de funciones, por favor abre un Issue en GitHub!
