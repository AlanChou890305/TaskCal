# 提交前檢查技能 (PR Check)

這個技能在你要 commit 或發 PR 前，自動檢查常見問題，避免提交有問題的 code。

整合了**程式碼品質**、**多語系**、**安全性**三大檢查項目。

## 觸發方式
使用者會用 `/pr-check` 來呼叫這個技能。

## 檢查項目

### 1. Git 狀態檢查
```bash
git status
git diff --cached  # 已 stage 的變更
git diff           # 未 stage 的變更
```

確認：
- 是否有未追蹤的重要檔案
- 是否有不小心 commit 的敏感檔案（.env、secrets）
- 變更範圍是否合理

### 2. 安全性檢查 🔐

#### 2.1 敏感檔案檢查
檢查 git status 中是否包含敏感檔案：
```bash
git status --short
```

**禁止提交的檔案類型**：
- 環境變數：`.env*`
- 憑證：`*.pem`, `*.key`, `*.cert`, `*.p12`, `*.mobileprovision`
- 配置：`GoogleService-Info.plist`（如果包含真實憑證）
- 資料庫：`*.sql`, `*.db`
- 備份：`*.backup`, `*.bak`
- IDE 臨時檔：`.cursor/chat/*`, `.cursor/prompts_history/*`

#### 2.2 敏感資訊掃描
掃描 staged changes 中是否包含敏感關鍵字：
```bash
git diff --cached | grep -iE "password|api_key|secret|token|private_key|access_token"
```

如果發現，檢查是否為：
- 範例/測試資料（可接受）
- 變數名稱（可接受）
- 實際的 key/password（**必須移除**）

#### 2.3 .gitignore 完整性檢查
確認 .gitignore 包含：
- `.env*`
- `*.log`
- `node_modules/`
- `ios/Pods/`
- `.cursor/chat/`
- `.cursor/prompts_history/`

### 3. 多語系檢查 🌐

#### 3.1 硬編碼文字偵測
掃描變更的 .js/.jsx 檔案，檢查是否有硬編碼文字。

**常見硬編碼模式**：
```javascript
// ❌ 錯誤：硬編碼
<Text>Save</Text>
<Text>儲存</Text>
<Button title="Click Me" />
<TextInput placeholder="Enter text" />
alert("Success");

// ✅ 正確：使用翻譯
<Text>{t.save}</Text>
<Button title={t.buttonLabel} />
<TextInput placeholder={t.placeholder} />
alert(t.successMessage);
```

**掃描方法**：
使用 Grep 搜尋可疑模式（在變更的檔案中）：
```bash
# 檢查 <Text> 標籤中的硬編碼
grep -n '<Text>[A-Za-z]' [changed_files]

# 檢查 title/placeholder 屬性
grep -n 'title="[^{]' [changed_files]
grep -n 'placeholder="[^{]' [changed_files]

# 檢查 alert/Alert
grep -n 'alert\s*(' [changed_files]
```

**例外情況**（可接受）：
- `console.log()` 訊息（debug 用）
- 技術性錯誤訊息（僅用於 log）
- 註解中的文字

#### 3.2 翻譯檔案同步檢查
如果變更涉及 UI 文字，檢查是否有更新 `src/locales/` 或相關翻譯檔案。

**檢查方法**：
1. 用 Grep 找翻譯檔案位置：
   ```bash
   find src -name "*translation*" -o -name "*locale*" -o -name "*i18n*"
   ```

2. 如果檔案有變更，檢查：
   - `translations_en` 和 `translations_zh` 是否同時更新
   - 新增的 key 在兩種語言中都存在
   - key 命名符合 camelCase 規範

3. 如果 UI 有變更但翻譯檔案沒變更，提出警告

### 4. 程式碼品質檢查

#### React Native 檔案
- [ ] 沒有 `console.log`（除非是刻意的 debug log）
- [ ] 沒有 `TODO` 或 `FIXME` 註解（或者已記錄到 issue）
- [ ] 沒有未使用的 import
- [ ] 沒有語法錯誤

#### iOS Widget 檔案
- [ ] Swift 語法正確
- [ ] 沒有 hardcoded 字串（應該用 localization）
- [ ] 沒有不安全的 force unwrap (驚嘆號)

### 5. 功能完整性檢查
- [ ] 如果改了 UI，是否有更新多語系檔案（`src/locales/` 三個語言：en、zh-Hant、es）
- [ ] 如果改了資料結構，是否有更新 Widget
- [ ] 如果改了 service，是否有更新錯誤處理
- [ ] 如果新增使用者操作（按鈕、流程），是否有在 `mixpanelService.js` 新增對應追蹤事件

### 6. 版本與文件檢查
如果是 release（提示使用者可用 `/version-release`）：
- [ ] `package.json` 版本號已更新
- [ ] `app.config.js` 版本號已更新
- [ ] `ios/TaskCal/Info.plist` 的 `CFBundleShortVersionString` 和 `CFBundleVersion` 已更新
- [ ] `RELEASE_NOTES.md` 已更新

### 7. 編譯檢查
提醒使用者執行：
```bash
# React Native
npm start

# iOS Widget (如果有改動)
cd ios && xcodebuild -workspace TaskCal.xcworkspace -scheme TaskCal -configuration Debug build
```

## 工作流程

### 步驟 1: 收集變更資訊
```bash
git status
git diff --stat
git diff --cached --stat
```

### 步驟 2: 安全性檢查

#### 2.1 檢查敏感檔案
```bash
git status --short
```
過濾出以下檔案類型並警告：
- `.env*`
- `*.pem`, `*.key`, `*.cert`, `*.p12`
- `GoogleService-Info.plist`
- `*.sql`, `*.db`

#### 2.2 掃描敏感資訊
```bash
git diff --cached | grep -iE "password|api_key|secret|token|private_key|access_token"
```
如果有匹配，讀取相關行數並判斷是否為實際的敏感資訊。

#### 2.3 檢查 .gitignore
用 `Read` 讀取 `.gitignore`，確認包含必要的忽略規則。

### 步驟 3: 多語系檢查

#### 3.1 找出變更的 JS/JSX 檔案
從 `git diff --cached --name-only` 中過濾出 `.js` 和 `.jsx` 檔案。

#### 3.2 掃描硬編碼文字
對每個變更的 JS/JSX 檔案：
1. 用 `Read` 讀取檔案內容
2. 用 Grep 搜尋可疑模式：
   - `<Text>` 標籤中的直接文字
   - `title="..."` 或 `placeholder="..."` 的硬編碼
   - `alert(...)` 呼叫
3. 記錄發現的硬編碼位置（檔案:行號）

#### 3.3 檢查翻譯檔案
1. 檢查變更清單中是否包含翻譯檔案
2. 如果有 UI 變更但沒有翻譯檔案變更，發出警告
3. 如果翻譯檔案有變更，用 `Read` 讀取並檢查 `en.js`、`zh-Hant.js`、`es.js` 三個檔案的 key 是否完全一致

### 步驟 4: 程式碼品質檢查

對每個變更檔案：
1. 用 `Read` 讀取（如果是 .js、.jsx 或 .swift）
2. 檢查：
   - `console.log` 出現次數
   - `TODO`/`FIXME` 註解
   - 未使用的 import（簡單判斷）
   - Swift 不安全的 force unwrap
3. 記錄發現的問題

### 步驟 5: 產出檢查報告

## 輸出格式

```markdown
## 📋 提交前檢查報告

### 變更摘要
- 修改檔案數: X 個
- 新增檔案數: Y 個
- 刪除檔案數: Z 個

### 檔案清單
#### React Native
- src/components/XXX.js - [變更說明]
- src/services/XXX.js - [變更說明]

#### iOS
- ios/TaskCalWidget/XXX.swift - [變更說明]

#### 其他
- docs/XXX.md - [變更說明]

---

## 🔍 檢查結果

### 🔐 安全性檢查
#### ✅ 通過項目
- [x] 沒有敏感檔案
- [x] 沒有檢測到 API keys 或 passwords
- [x] .gitignore 配置完整

#### 🚫 必須修正（如果有）
- [ ] 發現敏感檔案：.env (包含 API keys)
- [ ] src/config/api.js:12 發現 API_KEY = "abc123..."
- [ ] .gitignore 缺少 `.env*` 規則

---

### 🌐 多語系檢查
#### ✅ 通過項目
- [x] 沒有硬編碼文字
- [x] translations_en 和 translations_zh 已同步

#### ⚠️  需要注意（如果有）
- [ ] src/components/TaskList.js:45 - 硬編碼文字 "Loading..."
- [ ] src/components/Modal.js:23 - 硬編碼 title 屬性
- [ ] src/screens/Home.js:67 - 硬編碼 alert 訊息

#### 🚫 必須修正（如果有）
- [ ] UI 有變更但翻譯檔案未更新
- [ ] translations_en 有新 key 但 translations_zh 缺少對應翻譯

**建議修正**：
```javascript
// 原本（硬編碼）
<Text>Loading...</Text>

// 修正為
<Text>{t.loading}</Text>

// 並在翻譯檔案中新增：
// translations_en: { loading: "Loading..." }
// translations_zh: { loading: "載入中..." }
```

---

### 💻 程式碼品質檢查
#### ✅ 通過項目
- [x] 沒有多餘的 console.log
- [x] 沒有 TODO/FIXME 註解
- [x] 沒有語法錯誤

#### ⚠️  需要注意（如果有）
- [ ] 發現 3 處 console.log（src/components/XXX.js:45, 67, 89）
- [ ] src/services/taskService.js:123 有 TODO 註解
- [ ] src/components/Widget.swift:56 使用不安全的 force unwrap

---

### 🎯 功能完整性檢查
- [x] Widget 資料已同步
- [x] 錯誤處理已完善
- [ ] 如果有 iOS 變更，記得用 Xcode rebuild

---

## 📊 檢查總結

### 嚴重性分級
- 🚫 **必須修正**: X 項（無法提交）
- ⚠️  **需要注意**: Y 項（建議修正）
- ✅ **通過**: Z 項

---

### 建議 Commit 訊息
```
[類型]: [簡短描述]

- [變更項目 1]
- [變更項目 2]
- [變更項目 3]

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### 驗證指令
```bash
# 啟動 React Native
npm start

# 如果有 iOS 變更，用 Xcode build
open ios/TaskCal.xcworkspace
```

### 下一步
如果所有「🚫 必須修正」項目都已處理：
1. 執行上述驗證指令
2. 確認功能正常
3. 執行 `git add .`
4. 執行 `git commit -m "..."`
5. (可選) 執行 `/clear` 清除 context

如果「⚠️ 需要注意」項目太多，考慮先修正再提交。
```

## Commit 訊息類型參考

| 類型 | 使用時機 | 範例 |
|------|----------|------|
| feat | 新功能 | feat: 新增任務拖曳排序功能 |
| fix | 修 bug | fix: 修復 Widget 資料不同步問題 |
| refactor | 重構（不改行為） | refactor: 簡化 taskService 資料處理邏輯 |
| style | 樣式/格式調整 | style: 調整任務卡片間距 |
| docs | 文件 | docs: 更新 README 安裝說明 |
| chore | 雜事（依賴更新等） | chore: 升級 expo 到 54.0.25 |
| perf | 效能優化 | perf: 優化任務列表渲染效能 |

## 特殊情況處理

### 如果發現敏感資訊（必須修正）
立即警告使用者：
```markdown
🚨 **警告：發現敏感資訊**

以下檔案包含敏感資訊，不應該 commit：
- .env (包含 API keys)
- ios/TaskCal/GoogleService-Info.plist (包含 Firebase config)

請執行：
```bash
git reset HEAD [檔案路徑]
```

並確認 .gitignore 已包含這些檔案。
```

### 如果發現硬編碼文字（建議修正）
提供具體修正建議：
```markdown
⚠️  **發現硬編碼文字**

以下位置使用了硬編碼文字，建議改用翻譯系統：

**src/components/TaskList.js:45**
```javascript
// 目前（硬編碼）
<Text>No tasks available</Text>

// 建議修改為
<Text>{t.noTasksAvailable}</Text>
```

請在翻譯檔案中新增：
- `translations_en`: `{ noTasksAvailable: "No tasks available" }`
- `translations_zh`: `{ noTasksAvailable: "沒有可用的任務" }`

**src/components/Button.js:23**
```javascript
// 目前（硬編碼）
<Button title="Save" />

// 建議修改為
<Button title={t.save} />
```
```

### 如果翻譯檔案不同步（必須修正）
```markdown
🚫 **翻譯檔案不同步**

translations_en 和 translations_zh 的 key 不一致：

**缺少的 key (translations_zh)**:
- `newFeatureTitle`
- `confirmDelete`

**多餘的 key (translations_zh)**:
- `oldFeature` (已在 translations_en 移除)

請確保兩個翻譯檔案的 key 完全一致。
```

### 如果變更範圍過大
建議使用者拆分 commit：
```markdown
💡 **建議拆分 commit**

目前變更涉及多個不相關功能：
- 功能 A: [檔案清單]
- 功能 B: [檔案清單]

建議分別 commit：
1. 先 stage 功能 A 的檔案 → commit
2. 再 stage 功能 B 的檔案 → commit

這樣 git history 會更清晰，方便未來回溯。
```

### 如果 UI 有變更但翻譯未更新
```markdown
⚠️  **可能遺漏翻譯更新**

檢測到以下 UI 檔案有變更：
- src/components/NewFeature.js
- src/screens/SettingsScreen.js

但翻譯檔案 (src/locales/ 或類似路徑) 沒有變更。

請確認：
1. 是否有新增或修改顯示文字？
2. 如果有，是否已在翻譯檔案中新增對應的 key？

如果確認沒有新增文字，可以忽略此警告。
```

## 注意事項

### 一般原則
- 這個技能**不會自動修改檔案**，只做檢查與建議
- 如果使用者希望自動修正某些問題（例如移除 console.log），需明確要求
- Widget 相關變更一定要提醒 Xcode rebuild

### 安全性檢查
- 敏感資訊檢查可能有誤判（例如範例資料、註解中的文字）
- 如果不確定，提醒使用者自行確認
- .gitignore 檢查只驗證基本規則，不是完整的安全審計

### 多語系檢查
- 硬編碼偵測可能有誤判（例如 debug log、技術性文字）
- 如果檔案中有 `{t.xxx}` 模式，表示已使用翻譯系統
- 翻譯檔案路徑可能因專案而異，需要用 `find` 或 `Glob` 尋找
- 檢查範圍限於 `.js` 和 `.jsx` 檔案，不包含 `.swift` (iOS 原生翻譯方式不同)

### 誤判處理
如果發現誤判，在報告中註明：
```markdown
⚠️  可能誤判：
- src/utils/logger.js:12 的 console.log 是正常的 logging 功能
- src/config/constants.js:5 的 "API_KEY" 是變數名稱，不是實際 key
```

### 效能考量
- 如果變更檔案超過 20 個，只抽樣檢查重要檔案
- 大型檔案（超過 1000 行）只檢查變更的區段，不讀取整個檔案
- 使用 `git diff` 而非 `Read` 來減少讀取量

### 版本發布檢查
如果檢測到這是 release commit（版本號有變更），提示使用者：
```markdown
💡 **提示：檢測到版本更新**

如果這是要發布新版本，建議使用 `/version-release` 來確保所有版本相關檔案都已更新。

`/version-release` 會自動檢查並更新：
- 所有 9 個版本號位置
- RELEASE_NOTES.md
- README.md
- App Store Connect 文案
```

## 快速參考

### 常見問題模式

| 問題類型 | 搜尋模式 | 嚴重性 |
|---------|---------|--------|
| 敏感檔案 | `.env*`, `*.pem`, `*.key` | 🚫 必須修正 |
| API Key 外洩 | `grep -i "api_key.*=.*['\"]"` | 🚫 必須修正 |
| 硬編碼文字 | `<Text>[A-Za-z]`, `title="[^{]"` | ⚠️ 建議修正 |
| 翻譯不同步 | 比對三個翻譯物件的 key (en/zh-Hant/es) | 🚫 必須修正 |
| console.log | `grep "console.log"` | ⚠️ 建議移除 |
| TODO 註解 | `grep -i "TODO\|FIXME"` | ⚠️ 需追蹤 |

### 檢查優先順序

1. **🚫 必須修正（阻擋提交）**：
   - 敏感資訊外洩
   - 翻譯檔案不同步
   - 語法錯誤

2. **⚠️ 強烈建議修正**：
   - 硬編碼文字
   - 多餘的 console.log
   - 安全性問題

3. **💡 提示改善**：
   - TODO 註解
   - 程式碼風格
   - 變更範圍過大
