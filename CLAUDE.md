# TaskCal 開發規範

這是 **TaskCal** 專案的開發指引，適用於 React Native (Expo) + iOS Widget (Swift) 技術棧。

## 技術棧與架構

- **前端框架**: React Native 0.81.5 + Expo SDK 54
- **iOS Native**: Swift (Widget Extension)
- **後端**: Supabase (Auth + Database)
- **狀態管理**: React Hooks + Context API
- **資料持久化**: AsyncStorage (本地) + Shared Group Preferences (Widget)
- **分析**: Mixpanel (App) + Google Analytics 4 (Web)
- **廣告**: Google AdMob

## 完成定義 (Definition of Done)

每個功能或修改完成時必須符合：

1. **可運行**:
   - React Native: `npm start` 不報錯
   - iOS Widget: Xcode build 成功
2. **檔案範圍**: 只修改必要檔案，不做「順手重構」
3. **錯誤處理**: 所有 API 呼叫、資料存取都有錯誤處理
4. **Widget 同步**: 如果涉及 Widget 資料，必須更新 `widgetService.js`
5. **在改完檔案後確認能編譯/運行再標記完成**

## 開發策略

### 一次只做一件事
- 每個任務結束後 `git commit`
- commit 後立刻 `/clear` 清除 context
- 卡住時用 `/compact` 指定焦點

### 檔案修改原則
- **禁止**：無關的格式化、註解、重構
- **禁止**：新增未被要求的功能
- **禁止**：修改未涉及的模組
- **只改**: 任務直接相關的邏輯

### 新功能開發流程
1. 先用 Glob/Grep 找出相關現有程式碼
2. 確認現有模式（命名、結構、錯誤處理）
3. 沿用現有模式實作新功能
4. 更新 Widget 資料（如需要）
5. 本地測試可運行

## 常見模組與職責

| 模組 | 職責 | 修改時機 |
|------|------|----------|
| `src/services/` | 業務邏輯、API、資料存取 | 新增功能、改資料流 |
| `src/components/` | UI 元件 | 新增畫面、改樣式 |
| `src/locales/` | 多語系文字 | 新增 UI 文字 |
| `ios/TaskCalWidget/` | iOS Widget (Swift) | Widget 顯示邏輯 |
| `src/services/widgetService.js` | Widget 資料同步 | Widget 資料變更 |

## Widget 開發注意事項

當修改涉及 **iOS Widget** 時：

1. **資料同步路徑**:
   - React Native → `widgetService.js` → Shared Group Preferences → Widget
2. **觸發時機**: 任務新增/刪除/完成時呼叫 `updateWidget()`
3. **Swift 檔案**: `ios/TaskCalWidget/TaskCalWidget.swift`
4. **測試方式**:
   - Xcode build Widget target
   - 手機/模擬器上長按主畫面測試

## 常見陷阱

- **不要** 直接修改 `ios/Pods/` (這是依賴檔案)
- **不要** 在 React Native 改完後忘記同步 Widget
- **不要** 使用 `expo start` 後忘記重新 build Widget
- **不要** 在 `/clear` 前就開始下一個任務

## 可用的開發 Skills

專案提供以下 Claude Skills 來自動化常見開發工作流程：

### `/rn-ios-feature` - 新功能開發
用於系統化開發 React Native + iOS Widget 功能。

**適用時機**：
- 新增功能或元件
- 修改現有功能邏輯
- 需要更新 Widget 的變更

**主要功能**：
- 自動探索相關程式碼
- 產出實作計畫與任務清單
- 確保 Widget 資料同步
- 提供完成檢查清單

### `/ios-widget-debug` - Widget 除錯
專門處理 iOS Widget 相關問題。

**適用時機**：
- Widget 資料不同步
- Widget 顯示錯誤
- Widget build 失敗

**主要功能**：
- 診斷 Widget 資料流問題
- 檢查 App Group 配置
- 提供修正方案與驗證步驟

### `/pr-check` - 提交前檢查
在 commit 或發 PR 前進行全面檢查。

**適用時機**：
- 每次提交前
- 準備發 PR 時

**主要功能**：
- **安全性檢查**：敏感檔案、API keys、.gitignore
- **多語系檢查**：硬編碼文字偵測、翻譯同步
- **程式碼品質**：console.log、TODO、語法錯誤
- **功能完整性**：Widget 更新、錯誤處理
- 產出詳細檢查報告與建議 commit 訊息

### `/version-release` - 版本發布總管
自動化版本發布的所有流程。

**適用時機**：
- 準備發布新版本到 App Store
- 需要更新版本號

**主要功能**：
- 自動更新所有 9 個版本號位置（package.json、app.config.js、iOS Info.plist、project.pbxproj 等）
- 更新 RELEASE_NOTES.md 和 README.md
- 產出 App Store Connect 文案（What's New、Promotional Text、Keywords）
- 提供完整的發布檢查清單
- 驗證版本號一致性

---

## 版本發布前檢查

使用 `/version-release` skill 可自動完成以下檢查：

- [ ] 所有 9 個位置的版本號已更新並一致
- [ ] RELEASE_NOTES.md 已更新（包含三種語言）
- [ ] README.md 版本資訊已更新
- [ ] App Store Connect 文案已準備
- [ ] `npm start` 正常啟動
- [ ] iOS Widget build 成功
- [ ] 新功能已測試（至少手動 smoke test）

---

## 開發工作流程建議

### 開發新功能
```bash
1. 使用者說明需求
2. 執行 `/rn-ios-feature` 產出實作計畫
3. 逐步實作功能
4. 執行 `/pr-check` 檢查程式碼品質
5. commit 並執行 `/clear`
```

### 準備發布版本
```bash
1. 確保所有功能已完成並測試
2. 執行 `/version-release` 更新版本
3. 執行 `/pr-check` 最終檢查
4. commit 版本更新
5. 使用 Xcode Archive 並上傳 App Store
```

### 修復 Widget 問題
```bash
1. 使用者描述 Widget 問題
2. 執行 `/ios-widget-debug` 診斷問題
3. 根據建議修正
4. 測試驗證
5. 執行 `/pr-check` 並 commit
```

---

💡 **Skill 快速參考**:
- `/rn-ios-feature` - 新功能開發工作流程
- `/ios-widget-debug` - Widget 除錯專用
- `/pr-check` - 提交前全面檢查（安全性+多語系+品質）
- `/version-release` - 版本發布自動化
