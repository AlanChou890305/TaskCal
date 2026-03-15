# React Native + iOS Feature 開發技能

這個技能幫你系統化開發 React Native + iOS Widget 功能，確保每個步驟都符合專案規範。

## 觸發方式
使用者會用 `/rn-ios-feature` 來呼叫這個技能。

## 工作流程

### 1. 收集需求
向使用者確認（如果不清楚）：
- 功能描述（做什麼？）
- 涉及畫面（哪些 Screen/Component？）
- 資料來源（API / 本地 / Supabase？）
- 是否需要更新 Widget？

### 2. 探索現有程式碼
依序執行：
1. 用 `Glob` 找出相關檔案（例如 `src/components/*TaskList*.js`）
2. 用 `Read` 讀取相關檔案，了解現有模式
3. 用 `Grep` 找類似功能的實作參考

### 3. 產出實作計畫
建立任務清單（使用 TaskCreate）：
- **任務拆解**: 每個任務只涉及 1-3 個檔案
- **依賴順序**: 標記哪些任務需要先完成
- **驗證方式**: 每個任務完成後如何驗證

範例任務結構：
```
Task 1: 更新資料模型 (src/services/taskService.js)
Task 2: 新增 UI 元件 (src/components/NewFeature.js)
Task 3: 整合到主畫面 (src/screens/MainScreen.js)
Task 4: 同步到 Widget (src/services/widgetService.js)
Task 5: 測試與驗證 (npm start 手動測試)
```

### 4. 實作規則
每個任務執行時：
- 只修改必要檔案
- 沿用現有命名與結構模式
- 所有 API 呼叫都加 try/catch
- 如果涉及 Widget，呼叫 `updateWidget()`
- 任務完成前，確認沒有語法錯誤

### 4.5 Analytics 埋點
如果新功能涉及新的使用者操作（按鈕點擊、流程完成、設定變更等）：
1. 用 `Grep` 在 `mixpanelService.js` 找現有事件命名規範
2. 根據現有規範建議需要新增的事件
3. 提醒使用者在對應位置呼叫 `mixpanelService.track(...)`

### 4.6 Supabase Schema 變更
如果任務涉及資料模型變更（新增欄位、改 Task 結構）：
- [ ] `taskService.js` CRUD 邏輯已更新
- [ ] `widgetService.js` 同步資料結構已對應更新
- [ ] 本地 AsyncStorage cache 的格式相容（考慮舊資料）
- [ ] 如果是新增欄位，確認 nullable 或有預設值，避免舊版資料出錯

### 5. Widget 特殊處理
如果需要更新 Widget：
1. 確認要傳遞給 Widget 的資料結構
2. 更新 `widgetService.js` 的 `updateWidget()` 函式
3. 更新 `ios/TaskCalWidget/TaskCalWidget.swift`（如果需要）
4. 提醒使用者需要用 Xcode rebuild Widget target

### 6. 完成檢查
所有任務完成後：
- 提醒使用者執行 `npm start` 驗證
- 如果有 Widget 改動，提醒 Xcode build
- 建議 commit 訊息範例
- 建議使用者 `/clear` 開始下一個任務

## 輸出格式

### 計畫階段
```markdown
## 功能實作計畫：[功能名稱]

### 涉及檔案
- src/components/XXX.js (新增/修改)
- src/services/XXX.js (修改)
- ios/TaskCalWidget/TaskCalWidget.swift (修改，如需要)

### 任務清單
已使用 TaskCreate 建立以下任務：
1. [Task ID] - 任務描述
2. [Task ID] - 任務描述
...

### 驗證方式
- [ ] npm start 正常啟動
- [ ] 功能可正常操作
- [ ] Widget 資料同步正確（如適用）
```

### 實作階段
逐一完成任務，每完成一個：
1. 更新 TaskUpdate 標記為 completed
2. 說明這個任務做了什麼
3. 提醒接下來的任務

### 完成階段
```markdown
## ✅ 功能完成

### 變更摘要
- 檔案 A: 做了什麼
- 檔案 B: 做了什麼

### 驗證步驟
1. 執行 `npm start`
2. [具體測試步驟]

### 建議 commit 訊息
```
feat: 新增 [功能名稱]

- 新增 XXX 元件
- 更新 XXX 服務
- 同步 Widget 資料

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### 下一步
建議執行 `/clear` 清除 context，避免影響下一個任務。
```

## 重要提醒
- 不要做「順手重構」
- 不要新增未被要求的功能
- 不要修改格式、註解（除非是新增的 code）
- Widget 改動一定要提醒使用者 rebuild
