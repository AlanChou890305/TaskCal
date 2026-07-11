# 版本發布總管技能

這個技能整合所有版本發布相關的流程，確保版本號更新完整、文件同步、App Store 文案齊全。

## 觸發方式
使用者會用 `/version-release` 來呼叫這個技能。

## 適用場景
- 準備發布新版本到 App Store
- 更新 iOS 版本號
- 準備 App Store Connect 提交文案

## 工作流程

### 步驟 1: 收集版本資訊

向使用者確認（使用 AskUserQuestion）：

1. **新版本號** (例如: 1.2.7)
2. **Build 號** (例如: 15)
3. **版本類型**:
   - PATCH (bug fixes, 小調整)
   - MINOR (新功能, 向後相容)
   - MAJOR (破壞性變更)
4. **主要變更內容** (用於生成 What's New)

### 步驟 2: 更新版本號 (所有 9 個位置)

必須依序更新以下檔案：

#### 2.1 核心配置檔案 (3 個)
```markdown
1. package.json
   - 欄位: "version"
   - 範例: "1.2.7"

2. app.config.js
   - 欄位: version, iosBuildNumber
   - 範例: version: "1.2.7", iosBuildNumber: "15"

3. src/services/versionService.js
   - 欄位: currentVersion, currentBuildNumber
   - 範例: currentVersion: '1.2.7', currentBuildNumber: '15'
```

#### 2.2 iOS 原生檔案 (6 個位置)
```markdown
4. ios/TaskCal/Info.plist
   - CFBundleShortVersionString: 1.2.7
   - CFBundleVersion: 15

5. ios/TaskCalWidget/Info.plist
   - CFBundleShortVersionString: 1.2.7
   - CFBundleVersion: 15

6. ios/TaskCal.xcodeproj/project.pbxproj
   - MARKETING_VERSION: 1.2.7 (所有出現的地方)
   - CURRENT_PROJECT_VERSION: 15 (所有出現的地方)
```

**重要**: 使用 `Edit` 工具的 `replace_all` 參數來替換所有出現的版本號。

### 步驟 3: 更新文件檔案

#### 3.1 更新 RELEASE_NOTES.md

結構範本：
```markdown
# Release Notes - Version {version} (Build {build})

**Release Date**: {YYYY-MM-DD}

---

## What's New

### English
- {主要變更 1}
- {主要變更 2}
- {主要變更 3}

### 繁體中文
- {主要變更 1 中文}
- {主要變更 2 中文}
- {主要變更 3 中文}

### Español
- {主要變更 1 西班牙文}
- {主要變更 2 西班牙文}
- {主要變更 3 西班牙文}

---

## Promotional Text (App Store)

### English
{簡短、吸引人的描述，最多 170 字符}

### 繁體中文
{簡短、吸引人的描述，最多 170 字符}

### Español
{簡短、吸引人的描述，最多 170 字符}

---

## Keywords

task management, todo list, productivity, calendar widget, iOS widget, task organizer

---

## Release Checklist

- [ ] Version numbers updated in all 9 locations
- [ ] RELEASE_NOTES.md updated
- [ ] README.md version information updated
- [ ] App tested on simulator
- [ ] Widget tested and working
- [ ] Xcode Archive successful
- [ ] App Store Connect submission ready
```

**注意**:
- 只保留最新版本的內容，移除所有舊版本
- 如果使用者沒提供完整的變更內容，使用 Grep 搜尋最近的 commit 訊息來推測

#### 3.2 更新 README.md

只更新版本資訊區塊，移除舊版本：
```markdown
### 版本資訊 / Version Information

- **最新版本 / Latest Version**: v{version}
- **Build 號 / Build Number**: {build}
- **更新日期 / Release Date**: {date}
```

確保繁體中文、English、Español 三個語言區塊都有更新。

### 步驟 4: 驗證版本號一致性

執行以下檢查命令：

```bash
# 檢查版本號
grep -r "{version}" package.json app.config.js ios/TaskCal/Info.plist ios/TaskCalWidget/Info.plist src/services/versionService.js

# 檢查 Build 號
grep -r "CFBundleVersion\|CURRENT_PROJECT_VERSION\|iosBuildNumber\|currentBuildNumber" ios/ app.config.js src/services/versionService.js | grep -E "{build}|{version}"

# 檢查 project.pbxproj
grep "MARKETING_VERSION\|CURRENT_PROJECT_VERSION" ios/TaskCal.xcodeproj/project.pbxproj
```

### 步驟 5: 產出 App Store Connect 文案

從 RELEASE_NOTES.md 提取，方便使用者直接複製：

```markdown
## 📱 App Store Connect 提交文案

### What's New (複製此內容到 App Store Connect)

**English:**
- {變更 1}
- {變更 2}
- {變更 3}

**繁體中文:**
- {變更 1}
- {變更 2}
- {變更 3}

**Español:**
- {變更 1}
- {變更 2}
- {變更 3}

### Promotional Text (複製此內容到 App Store Connect)

**English:** {promotional text}
**繁體中文:** {promotional text}
**Español:** {promotional text}

### Keywords
{keywords}
```

### 步驟 6: 建立 Release Tag（復原錨點）

> **目的**：每個送 App Store 的 build 都要有一個對應的 git tag，作為「復原錨點」。
> 將來線上版本出問題時，可用 `git checkout {tag}` 一行回到與 App Store 一模一樣的程式碼，
> 不必翻 git log 對日期、猜 build number。

**⚠️ 這一步和步驟 1-5（版本號 bump + commit）是分開的流程，不會自動接續執行。**

Claude 沒有 Xcode 或 App Store Connect 的存取權限，**無法自行判斷有沒有真的 Archive、真的送審**。
版本號 bump 完並 commit 之後，**流程到此為止，不要主動打 tag**。

**重要原則**：
- **只在「使用者明確告知已經 Archive／已送審／已上傳」時才打 tag**，不是版本號 bump 完就打，也不是每次 commit 都打。
- 觸發詞例如：「送審了」「已經 Archive 了」「上傳完成」「submitted」等使用者明確的完成宣告。
- 如果對話中不確定是否已經送審（例如只是說「準備要 Archive」），**主動詢問使用者「這個版本已經送出 Archive／審核了嗎？」**，得到肯定答覆才執行，不要自行假設或提前打 tag。
- tag 要打在「版本號 bump」的那個 commit 上（不一定是當下的 HEAD，可能是稍早的 commit）。
- tag 命名一律用：`v{version}-build{build}`，例如 `v2.0.0-build39`。

```bash
# 1. 確認目前 HEAD 就是要送審的 commit（版本號已 bump）
git log -1 --oneline

# 2. 建立 annotated tag（含送審資訊）
git tag -a v{version}-build{build} -m "App Store 送審版本 {version} (Build {build})

送審日期: {YYYY-MM-DD}
對應 commit: {HEAD 的 hash 與 subject}"

# 3. 確認 tag
git tag -n5 -l "v{version}-build{build}"

# 4.（可選）推送到 GitHub，讓 tag 在遠端也看得到
git push origin v{version}-build{build}
```

**復原方式**（供使用者參考）：
```bash
git checkout v{version}-build{build}   # 回到該版本送審時的程式碼
```

**已建立的 tag 對照**（每次發版後補上一行，方便追溯）：
| Tag | 版本 | Build | 送審日期 | Commit |
|-----|------|-------|---------|--------|
| `v2.0.0-build38` | 2.0.0 | 38 | 2026-06-05 | `d31d46e` |
| `v2.0.3-build42` | 2.0.3 | 42 | 2026-07-11 | `ef8c8be` |

### 步驟 7: 建立 GitHub Release

> **目的**：tag 只是復原錨點，GitHub Release 讓 RELEASE_NOTES.md 的內容在 GitHub 上可見、可搜尋，
> 也是團隊/未來自己回顧「這個版本改了什麼」最快的地方。

**重要原則**：
- **每次打 tag 之後都要建立對應的 Release**，兩者一一對應，不要只推 tag 不建 Release。
- Release 標題固定格式：`v{version} (Build {build})`。
- Release 內容直接取用 RELEASE_NOTES.md 的「What's New」三語段落（English / 繁體中文 / Español）。
- tag 必須先推到遠端（`git push origin v{version}-build{build}`），`gh release create` 才找得到它。

```bash
# 1. 確保 tag 已推送到遠端
git push origin v{version}-build{build}

# 2. 用 RELEASE_NOTES.md 的內容建立 Release
gh release create v{version}-build{build} \
  --title "v{version} (Build {build})" \
  --notes-file <(sed -n '/## What.s New/,/^---$/p' RELEASE_NOTES.md)

# 3. 確認 Release 已建立
gh release view v{version}-build{build}
```

**如果 tag 是後補的**（例如漏掉某個版本沒建 tag/release，事後補上）：
- tag 直接打在當初 bump 版本號的那個 commit 上（不是 HEAD），例如：
  `git tag -a v{version}-build{build} {commit-hash} -m "..."`
- Release 一樣依上面步驟建立，`gh release create` 會自動指向該 tag 對應的 commit。

## 輸出格式

### 階段 1: 版本資訊收集

```markdown
## 🎯 版本發布準備

### 版本資訊
- 版本號: {version}
- Build 號: {build}
- 版本類型: {PATCH/MINOR/MAJOR}
- 主要變更: {列出}

正在更新檔案...
```

### 階段 2: 檔案更新完成

```markdown
## ✅ 檔案更新完成

### 已更新檔案 (9 個位置)

#### 核心配置
- [x] package.json → version: {version}
- [x] app.config.js → version: {version}, iosBuildNumber: {build}
- [x] src/services/versionService.js → currentVersion: {version}, currentBuildNumber: {build}

#### iOS 原生檔案
- [x] ios/TaskCal/Info.plist → CFBundleShortVersionString: {version}, CFBundleVersion: {build}
- [x] ios/TaskCalWidget/Info.plist → CFBundleShortVersionString: {version}, CFBundleVersion: {build}
- [x] ios/TaskCal.xcodeproj/project.pbxproj → MARKETING_VERSION: {version}, CURRENT_PROJECT_VERSION: {build}

#### 文件檔案
- [x] RELEASE_NOTES.md → 已更新為 v{version}
- [x] README.md → 版本資訊已更新
```

### 階段 3: 驗證結果

```markdown
## 🔍 版本號驗證

已執行驗證命令，所有版本號一致 ✅

{顯示 grep 結果摘要}
```

### 階段 4: App Store 文案

```markdown
## 📱 App Store Connect 文案

### What's New (英文)
{從 RELEASE_NOTES.md 提取}

### What's New (繁體中文)
{從 RELEASE_NOTES.md 提取}

### What's New (西班牙文)
{從 RELEASE_NOTES.md 提取}

### Promotional Text
**English:** {text}
**繁體中文:** {text}
**Español:** {text}

### Keywords
{keywords}
```

### 階段 5: 發布檢查清單

```markdown
## 📋 發布前檢查清單

### 必須完成
- [ ] 執行 `npm start` 確認 App 可正常啟動
- [ ] 用 Xcode 開啟專案: `open ios/TaskCal.xcworkspace`
- [ ] 在模擬器測試主要功能
- [ ] 測試 Widget 功能正常
- [ ] 執行 Xcode Archive（Product → Archive）
- [ ] 驗證 Archive 中的版本號正確

### App Store Connect 提交
- [ ] 登入 App Store Connect
- [ ] 建立新版本 {version}
- [ ] 貼上 What's New (三種語言)
- [ ] 貼上 Promotional Text
- [ ] 更新 Keywords
- [ ] 上傳 Archive
- [ ] 提交審核

### Git 提交與 Tag
建議 commit 訊息：
\`\`\`
chore: Bump version to {version} (Build {build})

- Update version numbers in all configuration files
- Update RELEASE_NOTES.md with new features
- Update README.md version information
- Prepare for App Store submission

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
\`\`\`

**⚠️ tag 與 Release 不在這次流程自動執行**，要等使用者明確說「已經送審/Archive 完成」才做（見步驟 6、7）。

### 下一步
1. 完成上述檢查清單
2. 提交 commit: `git add -A && git commit`
3. 推送到 GitHub: `git push origin {branch}`
4. 進行 Xcode Archive 並送 App Store 審核
5. **等使用者回報「已送審/已上傳 Archive」後**，才執行步驟 6（打 tag + push tag）與步驟 7（建立 GitHub Release）
6. 執行 `/clear` 清除 context
```

## 特殊情況處理

### 如果使用者沒提供變更內容

使用 `Bash` 工具查看最近的 commit：
```bash
git log -5 --oneline
git log --since="7 days ago" --pretty=format:"%s"
```

根據 commit 訊息推測主要變更，並向使用者確認。

### 如果發現版本號不一致

在更新前先讀取所有相關檔案，檢查當前版本號：
```bash
echo "=== package.json ===" && grep '"version"' package.json
echo "=== app.config.js ===" && grep 'version:' app.config.js
echo "=== iOS Info.plist ===" && grep -A1 "CFBundleShortVersionString" ios/TaskCal/Info.plist
```

如果發現不一致，警告使用者並顯示差異。

### 如果 RELEASE_NOTES.md 不存在

建立新檔案，使用完整範本。

## 版本類型判斷指南

提供給使用者參考：

| 類型 | 使用時機 | 範例 |
|-----|---------|------|
| PATCH | Bug fixes、小調整、文字修正 | 1.2.6 → 1.2.7 |
| MINOR | 新功能（向後相容）、UI 改善 | 1.2.6 → 1.3.0 |
| MAJOR | 破壞性變更、重大架構調整 | 1.2.6 → 2.0.0 |

## Promotional Text 撰寫建議

- 最多 170 字符
- 強調使用者利益（不是技術細節）
- 突出最重要的改進
- 語氣積極、吸引人

**範例**：
- ❌ "Fixed bugs and improved performance"
- ✅ "Experience faster load times and smoother task management with our latest updates"

## 注意事項

- iOS 原生檔案（Info.plist、project.pbxproj）是最容易遺漏的
- `project.pbxproj` 有多個版本號位置，必須全部更新
- RELEASE_NOTES.md 只保留最新版本
- Widget 的 Info.plist 必須與主 App 版本號一致
- 使用 `replace_all: true` 來確保替換所有出現的版本號

## 常見錯誤與解決

### 錯誤 1: 忘記更新 project.pbxproj
**症狀**: Xcode Archive 後版本號不對
**解決**: 使用 `replace_all` 參數更新所有 MARKETING_VERSION

### 錯誤 2: Widget 版本號不一致
**症狀**: App Store Connect 警告版本號不匹配
**解決**: 確保 TaskCalWidget/Info.plist 與主 App 一致

### 錯誤 3: RELEASE_NOTES.md 包含舊版本
**症狀**: 檔案過長，難以維護
**解決**: 每次更新時移除所有舊版本內容

## 工具使用提示

- 使用 `Read` 讀取檔案前先確認檔案存在
- 使用 `Edit` 的 `replace_all` 參數替換版本號
- 使用 `Bash` 執行驗證命令
- 不要使用 `Write` 覆寫整個檔案（除非是新建立的 RELEASE_NOTES.md）
