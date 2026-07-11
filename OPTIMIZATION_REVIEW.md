# TaskCal 效能與優化建議清單

**範圍**：`src/services/`、`src/config/`、`src/components/`、`src/screens/`、`src/navigation/`、`src/contexts/`、`src/hooks/`、`src/locales/`、`src/types/`、`src/utils/`、`ios/TaskCalWidget/`（全 codebase 效能面向）
**日期**：2026-07-11
**方式**：6 個唯讀掃描 subagent 分區覆蓋 + 人工去重、合併、重新排序，關鍵項目已回頭讀原始碼覆核行號正確性

**與 `CODE_REVIEW.md` 的關係**：互補、不重複。`CODE_REVIEW.md`（2026-07-10）涵蓋安全性、功能風險、資料結構、已修復的效能熱點（CalendarScreen 任務列表 memo 化）與可維護性起步；本文件**只收錄尚未處理的效能與優化機會**，且刻意不重複前份報告已列的安全性/功能 bug。

**進度**：2026-07-11 已依「建議優先處理順序」完成前 5 項（A1、A2、B3、B1、A4，各自獨立 commit，詳見下方對應段落的 ✅ 標記）。其餘項目（B2、B4、B5、C、D、E、F、G）仍是待處理清單，尚未修復。

---

## 總評

以下優先順序是綜合「影響範圍（多少畫面/多少使用者路徑受影響）」「觸發頻率（日常操作 vs. 邊緣情境）」「修復成本（一行改動 vs. 大重構）」三者重新判斷後的結果，**不是各分項報告原本標的高/中/低**，部分項目因此被重新分級或合併。

| 主題 | 代表問題 | 判定優先度 | 修復成本 |
|------|----------|------------|----------|
| A. 常見操作的隱性網路/native 往返 | 切換月曆月份打 auth 網路請求；任務 CRUD 同步等待通知排程；設定寫入多打一次讀取；完成任務觸發 8 次序列化 AsyncStorage | 🔴 最高 | 低～中 |
| B. React re-render／memoization 缺口 | App.js Context 全域無 memo；SettingScreen 全檔案無 memo；EditTaskModal 元件在 render 內定義；CalendarGrid 無 memo | 🔴 高 | 低～高（分項不同）|
| C. 多語系/資源 eager loading | 三語系與 Terms/Privacy 巨量文字永遠全載入記憶體 | 🟠 中高 | 中 |
| D. iOS Widget 重整策略 | Timeline 每小時強制重整，疊加多處未快取運算 | 🟠 中高 | 低～中 |
| E. 計時器/動畫生命週期管理 | SplashScreen setTimeout 重試鏈未清理；shimmer 迴圈載入完成後仍跑 | 🟡 中 | 低 |
| F. 重複程式碼（boilerplate） | 錯誤判斷/顯示名稱萃取邏輯散落多處；兩個 BottomSheet 元件 90% 重複 | 🟡 中 | 低 |
| G. 模組常數在函式/迴圈內重建 | JS 與 Swift 兩側都有「該是常數卻每次呼叫重建」的小反模式 | 🟢 低 | 低（瑣碎但集中處理 CP 值高）|

---

## A. 常見操作的隱性網路／native 往返（🔴 最高優先）

這組問題的共同點：都发生在**使用者每天會做很多次**的操作路徑上（切月曆、新增/編輯/完成任務、改設定），而且都是「可以直接省略或延後的等待」，修復成本普遍偏低。

### ✅ A1（已修復，`a5197b9`）. `CalendarScreen.js:292` — 每次切換月曆月份都呼叫 `supabase.auth.getUser()`（真實網路請求）
已覆核程式碼。此呼叫位於 `fetchTasksForVisibleRange`（依賴 `[visibleYear, visibleMonth, isInitialized]` 的 effect 內），代表使用者每滑動一次月曆月份，都會對 Supabase Auth 伺服器發一次 JWT 驗證請求（`getUser()` 是遠端驗證，不同於本地讀取的 `getSession()`），即使 session 完全沒變。
**影響**：這是 App 內最高頻的手勢之一，每次都多一段網路延遲，属于使用者最容易「感覺到卡」的地方。
**建議**：改用 `supabase.auth.getSession()`（本地無網路）取出 user id；或在 `isInitialized` 階段快取一次 user，之後切月份不重複驗證。

### ✅ A2（已修復，`7d83674`）. 任務新增/更新/完成同步等待通知（重）排程，且取消邏輯本身有不必要的全量掃描
合併兩個關聯發現：
- **`src/services/taskService.js:303-327`（`addTask`）、`405-443`（`updateTask`）、`494-531`（`toggleTaskChecked`）** 皆 `await scheduleTaskNotification`/`cancelTaskNotification` 後才 `return taskResult`（已覆核 `addTask` 段落，確認 `await scheduleTaskNotification(...)` 確實在 `return taskResult` 之前）。代表「新增有時間的任務」「改任務時間」「打勾完成任務」這些高頻操作，都要等原生通知 API 往返完才算完成，即便呼叫端不需要這個副作用的結果。
- **`src/services/notificationService.js:283-320`（`cancelTaskNotification`）** 已覆核：每次取消都先呼叫 `Notifications.getAllScheduledNotificationsAsync()` 抓「全部」已排程通知回 JS 端過濾，再逐一（非平行）`await cancelScheduledNotificationAsync`；隨後**不論前面有沒有找到，都還會再多打 3 次**針對 `task-{id}-30/10/5` 的確定性 ID 取消。既然 ID 本身就是確定性可推算的，這個「先枚舉全部再過濾」的步驟完全可以省略，只保留確定性 ID 取消（固定 3 次呼叫）即可。
**影響**：每個「加任務／改時間／打勾完成」都疊加一次可省略的全量掃描 + 多段序列化 native 往返，是使用者最常做的操作之一。
**建議**：`cancelTaskNotification` 拿掉 `getAllScheduledNotificationsAsync` 枚舉步驟，只做確定性 ID 取消；`taskService.js` 三處呼叫改成 fire-and-forget（`.catch()` 記錄錯誤即可，不 `await`），與同檔案其他非關鍵副作用的既有寫法一致。

### A3. `src/services/userService.js:259-268`（`updateUserSettings`）— 每次寫設定都多打一次完全用不到結果的讀取
已覆核程式碼：更新設定前一律 `await this.getUserSettings()`（內含自己的 `supabase.auth.getSession()` + 一次 `SELECT`），純粹為了「確保 row 存在」的副作用，回傳值完全丟棄。但 `updateUserSettings` 本身已經拿得到 `session.user`，且更新路徑本身已有「row 不存在」的 fallback（`PGRST116` → upsert）。
**影響**：使用者切主題、切語言、改提醒設定，每次都多一趟完全重複的網路來回。
**建議**：移除這次多餘的 `getUserSettings()` 呼叫，直接依賴既有的 upsert fallback。

### ✅ A4（已修復，`1a56a44`）. `src/services/reviewService.js:52-111, 151-177`（`recordTaskCompletionAndMaybePrompt`）— 完成任務觸發最多 8 次序列化 AsyncStorage 往返
「打勾完成任務」是全 App 最高頻互動之一，但每次都嚴格序列跑：讀完成次數 → 寫回 → 讀/寫「連續使用天數」（2 次讀 + 最多 2 次寫）→ 讀 prompt 次數 → （達門檻時）再讀/寫 2 次 prompt 相關 key。全部沒有用 `AsyncStorage.multiGet`/`multiSet` 批次化。
**影響**：單次操作看似小，但因觸發頻率極高（每次打勾都跑），累積的 native 橋接次數不可忽視。
**建議**：改用 `multiGet` 一次讀出所有需要的 key，邏輯算完後用 `multiSet` 一次寫入。

---

## B. React re-render／memoization 缺口（🔴 高優先，含跨檔案的同一根因）

多個 agent 從不同角度回報了「同一組模式」：**元件缺少 memo、Context value 沒有穩定引用、事件 handler 沒有 `useCallback`**，實質上是同一件事在不同層級重複出現。以下依「牽動範圍」由大到小排列。

### ✅ B1（已修復，`815a96e`）. `App.js:310-325` — 三個 Context Provider（Theme/User/Language）value 皆為行內物件字面量，且 `UserContext` 混雜了不相關的兩組職責
已覆核程式碼，確認 `ThemeContext.Provider`、`UserContext.Provider`、`LanguageContext.Provider` 的 `value` 都直接寫字面量，沒有 `useMemo` 包裝；且 `App.js:139/175/187` 的 `setLanguage`/`setThemeMode`/`toggleTheme` 也沒有 `useCallback`。
這三個 Provider 包住整個 `NavigationContainer`，**任何 App 層 state 變動**（例如 `useVersionCheck` 非同步回來設定 `updateInfo`/`isUpdateModalVisible`）都會產生 3 個全新物件，強制所有下游 consumer（`MainTabs`、`CalendarScreen`、`SettingScreen`、`TaskDetailScreen`、`SplashScreen` 等共 20+ 處消費點）重新 render，即使 theme/language/userType 實際值沒變。
額外一個獨立但相關的問題：`UserContext` 把「使用者類型」（`userType`, `loadingUserType`）和「版本更新彈窗狀態」（`setUpdateInfo`, `setIsUpdateModalVisible`, `isSimulatingUpdate` 等）塞進同一個 context——`VersionUpdateModal` 實際上是走 props 直接傳遞（`App.js:372-379`），並不需要透過 context，但目前的分層讓「只關心 userType」的畫面也會因版更狀態變動而重新 render。
**影響**：這是全部 3 份中影響範圍最大的單一發現——因為它是 Provider 根層級,一次修正能減少後續所有子樹的無謂重繪，包含下面 B2（SettingScreen）本身也是這條線上的下游受害者。即使觸發頻率不算最高（App 層 state 變動不像切月份那麼頻繁），但修復成本低、槓桿極大。
**建議**：三個 `value` 分別用 `useMemo` 包裝（依賴陣列只放真正變動的欄位）；`setLanguage`/`setThemeMode`/`toggleTheme` 先改 `useCallback`（否則 `useMemo` 的依賴陣列仍會因函式參照每次變動而失效）；評估把 `updateInfo`/`isUpdateModalVisible` 相關 setter 移出 `UserContext`，改成單純 props 傳給 `VersionUpdateModal`。
**修復狀態**：`815a96e` 只處理了 `useMemo`/`useCallback` 部分（槓桿最大、成本最低的部分）。「`UserContext` 拆分 userType 與版更彈窗狀態」這個獨立子問題**尚未處理**，仍待後續評估。

### B2. `src/screens/SettingScreen.js`（2556 行）— 全檔案 0 個 `useMemo`、0 個 `React.memo`，僅 1 個 `useCallback`
已覆核第 60-99 行，確認有 4 組獨立 dropdown 開關 state（language/theme/userType/reminder）及多個其他 state，但缺乏任何子樹拆分或 memoization。任何一個 dropdown 切換或欄位輸入都會重新 render 整個 2500+ 行的 JSX（含多組 inline `.map()` 渲染）。這與 `CalendarScreen` 之前用 `React.memo` + `useCallback` + `tasksRef` 解決過的問題是同一類型，只是尚未套用到這個檔案；且因為是全 App 第二大檔案（僅次於已拆分的 SplashScreen），拆分/memo 化的維護效益也最大。
**影響**：Settings 是使用者常駐、常互動的頁面（4 個 dropdown + 多個開關），每次互動都重繪整個巨型子樹。
**建議**：拆出 Profile / 語言-主題-使用者類型 dropdown / 提醒設定 / 關於版本 等子元件並各自 `React.memo`；事件 handler 補 `useCallback`。可與既有的「2556 行難以維護」問題一併排入同一個重構工作階段。

### ✅ B3（已修復，`4fa6416`）. `src/components/calendar/EditTaskModal.js:84, 131` — `FieldRow`／`FieldDivider` 定義在元件內部（component-in-render 反模式）
每次使用者在新增/編輯任務彈窗打字（`taskText`/`taskTime`/`taskDate` 狀態變動由父層 `CalendarScreen` 提升管理），`EditTaskModal` 就會重新 render，而每次 render 都會產生「新的元件型別」`FieldRow`/`FieldDivider`，React 因型別不同會把日期列、時間列整段 **unmount 再 mount**，而非單純更新 props。
**影響**：這是使用者最常操作的彈窗，打字時反覆整段重繪會造成明顯可感知的卡頓，修復成本極低（純粹搬移程式碼位置）。
**建議**：把 `FieldRow`、`FieldDivider` 移到檔案頂層（module scope），可選擇加 `React.memo`。

### B4. `src/components/calendar/CalendarGrid.js:57-198` — 無 `React.memo`，且接收整包 `tasks`（全部月份）
任何任務異動（新增/刪除/勾選/編輯）都會讓 42 格月曆網格整個重新計算並重繪，包含每次重新產生 42 個 `Date` 物件（`getMonthDates()`）與 42 個內嵌 `onPress`/樣式陣列的 `TouchableOpacity`，即使實際只有一顆小圓點需要變化。
**影響**：日曆網格是常駐可見面積最大的元件之一，觸發頻率＝「任何任務異動」而不只是切換月份。
**建議**：`React.memo` 包裝；`useMemo` 包住 `getMonthDates(visibleYear, visibleMonth)`；評估把 `tasks` prop 改成只傳「每日任務數量摘要」而非整包物件。長期可再把單一日期格拆成獨立的 `CalendarDayCell`（`React.memo`），讓非月份切換的重繪只更新受影響的少數格子。

### B5. `src/components/calendar/TaskListArea.js` — 排序結果與 `renderItem` 身分不穩定
兩個關聯發現：`:234` 的 `FlatList` `data` prop 是行內 `dayTasks.slice().sort(...)`，每次 render 都建立新陣列參考（即使排序結果相同）；`:45-58` 的 `renderTask` `useCallback` 依賴陣列包含 `taskToMove`（整個物件參考），每次進出「搬移模式」都讓 `renderItem` 身分改變，使 `FlatList` 對所有可見列多跑一次 diff。
**建議**：排序結果用 `useMemo(() => ..., [dayTasks])` 包裝；`renderTask` 依賴改用 `taskToMove?.id` 而非整個物件。

---

## C. 多語系與啟動資源 eager loading（🟠 中高優先）

### C1+C2 合併：`src/locales/index.js:1-12` 全量 eager import 三語系，且 Terms/Privacy 文字佔每個語系檔 61-68%
`en.js`（26.5KB，Terms/Privacy 佔 68%）、`es.js`（30.2KB，佔 67%）、`zh-Hant.js`（21.2KB，佔 61%）三個檔案透過 `LanguageContext` 在 App 啟動時**全部**載入進 bundle 與記憶體，但：（a）`LanguageContext` 的 `t` 一次只會用其中一種語言；（b）Terms/Privacy 文字只有 `TermsScreen.js`/`PrivacyScreen.js` 兩個畫面用到（已 grep 全 repo 確認無其他引用）。兩者是同一個「不必要地載入用不到的資源」問題的兩層。
**影響**：直接影響 App 啟動時的 bundle 大小與記憶體佔用，每一位使用者都要付這個成本（不像其他項目只在特定操作時觸發）。
**建議**：把 `termsTitle...privacyAcknowledgment` 等 key 抽到獨立檔案，只在 Terms/PrivacyScreen mount 時動態 `import()`；`locales/index.js` 改成依當前 `language` 動態載入單一語系模組，語言切換時才載入新語系。兩者合併處理，預估可省下約 2/3 的 locale 相關 bundle 體積。

### C3. 次要清理（低優先，可與 C1+C2 順手處理）
- `src/locales/en.js:234-237`、`es.js:237-240`、`zh-Hant.js:233-236` — `bugReport`/`improvementSuggestion`/`featureRequest`/`feedbackOther` 共 12 個 key 全 repo 查無引用（`SupportScreen.js` 實際用的是 `feedbackLove`/`feedbackBug`/`feedbackIdea`/`feedbackQuestion`），確認是改名後留下的舊 key，可直接刪除。
- `src/utils/dateUtils.js:31-124`（`formatTimestamp`）— 94 行的死程式碼，被 `CalendarScreen.js:40` import 但全 repo 查無任何呼叫點，且與 locale 檔內既有 `months` 陣列邏輯重複，建議確認後移除。

---

## D. iOS Widget（Swift）重整策略（🟠 中高優先）

### D1. `TaskCalWidget.swift:163-164` — Timeline 排程永遠取「明天午夜」與「下一小時」的較小值，等於每小時強制重整
除了每天最後一小時外，`policy` 幾乎每次都等於 `nextHour`，代表即使任務資料完全沒變，WidgetKit 每小時都要重新讀 App Group、重新 decode JSON、重新 render View，持續消耗 iOS 對 widget 的每日重整配額（一般每個 widget 每天約 40-70 次），排擠掉真正因資料變動而需要的即時重整。
**建議**：改成只在「日期跨天」時才排下一次刷新（`.after(midnight)`），資料變動改由 RN 端主動呼叫 `WidgetCenter.shared.reloadTimelines` 觸發，把「時間到期」與「資料變動」兩種來源分開。

### D2. 疊加問題（因 D1 每小時觸發而被放大，建議與 D1 一起處理）
- **`TaskCalWidget.swift:102-113, 167-170, 183-190`** — `monthName`/`weekdayAbbr`/`todayKey`/`kickerString` 每次呼叫都新建一個 `DateFormatter`（Apple 文件明確指出這是昂貴且應快取重用的物件），疊加 D1 的每小時觸發，等於每小時重複建立好幾個 formatter。建議改為 `static let` 共用實例。
- **`TaskCalWidget.swift:172-179`（`loadAllTasksByDate`）** — `getSnapshot`/`getTimeline` 各自重新讀取 UserDefaults 字串並重新 `JSONDecoder().decode` 整包資料，即使同一次刷新週期內兩者資料完全相同。建議合併成內部共用方法一次讀取，或加簡易快取。
- **`TaskCalWidget.swift:173`** — `UserDefaults(suiteName:)` 每次呼叫都重新建立實例，`appGroupId` 是常數，建議改為 module 層級 `static let`。

### D3. 低優先（可延後）
- **`TaskCalWidget.swift:308-319`** — `body` 對所有 widget family 都無條件計算排序/過濾（`sorted`/`todoCount`/`doneCount`/`nextTime`），但 `largeLayout` 實際上是自己重新排序（line 633），這些預先算好的值對 large family 完全浪費；lock screen family 也用不到。建議把這些衍生值下放到各自 layout 內部按需計算。
- **`TaskCalWidget.swift:630`（`buildCalendarDays`）** — 同一年月的結果固定，但每次 large widget render 都重新計算，建議以「年-月」為 key 做簡易快取。

---

## E. 計時器／動畫生命週期管理（🟡 中優先）

### E1. `src/screens/SplashScreen.js:1171-1202`（`checkSessionWithRetry`）— 遞迴 `setTimeout` 重試鏈未在 unmount 時清除
2s/4s/6s/8s/10s 遞增延遲、最多 5 次的重試鏈是在事件處理函式內建立的，沒有存進 ref，也沒有對應的 cleanup effect。檔案內其他地方已註明 `SIGNED_OUT` 會導致元件 remount；若重試期間發生 unmount/remount，過期的 timeout 仍會觸發，對已卸載元件呼叫 `setIsSigningIn`/`navigation.reset`。這與 `CODE_REVIEW.md` 中已修復的「`hasNavigated` 過期閉包」「Session 失效未自動登出」屬於同一類 race condition 模式，只是這次出現在 Google 登入的重試邏輯裡，尚未修。
**建議**：timeout id 存入 `useRef` 陣列，在對應 effect 的 cleanup 中 `clearTimeout`。

### E2. `src/screens/SettingScreen.js:76-93` — shimmer 動畫迴圈只在 unmount 時停止，載入完成後仍持續執行
已覆核程式碼：`shimmerLoop.start()` 在掛載時啟動，cleanup 只在 `return () => shimmerLoop.stop()`（即整個元件 unmount 時）才停止；`CODE_REVIEW.md` 先前修復的是「迴圈完全沒有 stop、unmount 後洩漏」的問題（commit `ff18070`），已解決該部分。但這裡是**殘留的獨立問題**：shimmer 只在 `isLoadingProfile`/`isLoadingSettings` 為真時才有視覺用途，載入通常 1 秒內完成，之後整個 Settings 畫面存續期間（可能數分鐘）動畫迴圈仍白白執行。
**建議**：把 start/stop 綁定到 `isLoadingProfile || isLoadingSettings` 的變化，載入完成後主動呼叫 `stop()`，而不是只靠 unmount 才停。

### E3. `src/hooks/useAppLoading.js:31-37` — 模組層級可變單例 `sharedSettingsPromise`（低優先地雷）
目前只有 `App.js` 呼叫一次，暫無實際問題，但若未來被多次掛載（測試環境、Fast Refresh 等）會共享同一個 promise 造成跨 instance 混淆。建議若要保留「多個 loader 共用一次 API 呼叫」的優化意圖,改用附生命週期管理的快取，而非單純可變全域變數。

---

## F. 重複程式碼（boilerplate duplication，🟡 中優先）

### F1. `src/services/userService.js` — 網路錯誤判斷邏輯重複 7-8 次
`error.message?.includes("Network request failed") || ... || (!error.code && error.message)` 在 146-150、336-340、371-375、540-544、585-589、646-650、672-675 行重複出現，且**條件已經悄悄不一致**（有的多檢查 `!error.code && error.message`，有的只檢查 `!error.code`）。
**建議**：抽成單一 `isNetworkError(error)` helper，避免條件持續漂移。

### F2. 使用者顯示名稱萃取邏輯重複 5+ 次
`user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split("@")[0] || "User"` 在 `taskService.js` 的 `getTasks`（50-54）、`getTasksByDateRange`（140-144）、`getTasksForDate`（208-213）、`addTask`（247-251）、`updateTask`（352-356），以及 `userService.js`（272-273, 623-624）近似重複。
**建議**：抽成 `getUserDisplayName(user)` 共用 helper（放 `userService.js`），保證各處 fallback 行為一致。

### F3. `src/components/calendar/DatePickerOverlay.js` 與 `TimePickerOverlay.js` — 約 90% 程式碼重複
兩個底部彈出選擇器外殼（遮罩、抓手、取消/標題/完成三欄列、`insets.bottom` 處理）幾乎是同一份實作抄兩次（各 135/140 行）。非直接效能問題，但每次改共用行為（安全區、字型、動畫）都要改兩份，容易漏改造成不一致。
**建議**：抽出共用 `BottomSheetOverlay`，兩個檔案只傳入各自的 `<DateTimePicker mode="date"/>`或`mode="time"` 作為 children。

### F4. `src/components/AdBanner.js:64-91` — `ADS_PAUSED` 為 true 期間仍執行完整使用者狀態查詢
Hooks 順序限制讓 `checkUserStatus` effect 必須先跑完才會走到後面的 `if (ADS_PAUSED) return null;`，導致目前廣告全域關閉期間，每次 `AdBanner` 掛載仍會照常打一次 `UserService.getUserSettings()`，是純粹浪費的查詢；同時該 effect 也沒有 unmount guard，理論上存在 unmount 後 setState 的邊界情況。
**建議**：effect 開頭加 `if (ADS_PAUSED) return;` 提早跳出；加 `let cancelled = false` + cleanup 防止 unmount 後更新 state。

---

## G. 模組常數在函式/迴圈內重建（🟢 低優先，橫跨 JS 與 Swift 的同一種小反模式）

以下 5 個發現分散在不同檔案、不同語言，但都是同一種模式：**該是模組層級常數的東西，卻寫在每次呼叫都會重新執行的位置**。單一影響都很小，但因為模式重複出現、修法一致且風險為零，適合排一次性清理：

- `src/types/taskTypes.js:48-49`（`validateTaskFields`）— `Object.values(TASK_FIELDS)` 在 `forEach` 迴圈內每次重建 + O(n) `includes`；由 `taskService.createTaskObject` 每次建立/更新任務都會呼叫。建議提到模組層級 `const validKeys = new Set(Object.values(TASK_FIELDS))`，改用 `.has()`。
- `src/utils/mapUtils.js:10-14`（`isGoogleMapsUrl`）— 每次呼叫重建 3 個 `RegExp`，在非 memo 的 `MapPreview.js:32` 元件本體內呼叫，任務列表每次重繪都重建。建議把 pattern 陣列移到模組層級常數。
- `ios/TaskCalWidget/TaskCalWidget.swift` 的 `DateFormatter`（見 D2）與 `UserDefaults(suiteName:)`（見 D2）未快取，性質相同，已併入 D 區處理。

---

## 掃描範圍內已排除、影響過小予以省略的項目

以下項目在掃描中被發現，但經評估影響太小（單次成本低、觸發頻率低，或已有等效防護），不列入正式待辦，僅記錄供未來參考：

- `src/navigation/MainTabs.js:22-28` — `useEffect` 缺依賴陣列，每次 render 都重排一個 `setTimeout` 設定 `document.title`；單次成本可忽略。
- `src/navigation/CalendarStack.js:15-26`、`SettingsStack.js:17-28` — `screenOptions`（含 `cardStyleInterpolator`）行內重建；這兩個 wrapper 元件本身很少重新 render，實際影響低。
- `src/components/calendar/CalendarGrid.js:130-190` — 42 個日期格的 `onPress`/樣式為行內建立；已併入 B4 的長期建議（拆 `CalendarDayCell`），不單獨成項。
- `src/components/TaskItem.js`（`TaskSkeleton`）shimmer 動畫無 cleanup — 但因僅在 `shouldShowSkeleton` 短暫渲染 4 筆便被替換，實際洩漏風險低，不同於 E2 的 SettingScreen（常駐掛載數分鐘）。
- `src/hooks/useResponsive.js:27-42` — 回傳新物件、無 `useMemo`；目前所有呼叫端都只解構原始值使用，暫無實際 re-render 影響，僅為未來的隱藏地雷。
- `mixpanelService.js` 的 `console.log` 未依 production 環境判斷 — 因專案本身已在 `babel.config.js` 設定移除 `console.log`（保留 `error`/`warn`），此問題在正式版不構成效能影響。
- `dataPreloadService.js`、`widgetService.js`、`versionService.js`、`sessionCache.js`、`adService.js`、`src/config/` 全目錄、`IOSButton`/`IOSChip`/`IOSCheckbox` 等 leaf 元件、`TaskDetailScreen.js`、`OnboardingScreen.js` — 掃描確認無明顯效能問題或已有近期優化（如單次合併查詢、debounce 同步、正確的 cleanup），故不列入。

---

## 建議優先處理順序

綜合影響範圍 × 觸發頻率 × 修復成本，CP 值最高的前 5 項（建議依序處理，每項各自獨立 commit）：

1. ✅ **A1｜`CalendarScreen.js:292` 切換月份的 `auth.getUser()` 網路請求改為本地 `getSession()`**（`a5197b9`）— 一行等級的改動，直接消除全 App 最高頻手勢的網路延遲。
2. ✅ **A2｜任務 CRUD 的通知排程改 fire-and-forget，並移除 `cancelTaskNotification` 的全量枚舉步驟**（`7d83674`）— 修復成本中等，但直接影響「加任務/改時間/打勾完成」這幾個核心操作的感知速度。
3. ✅ **B3｜`EditTaskModal.js` 把 `FieldRow`/`FieldDivider` 移到 module scope**（`4fa6416`）— 純粹搬移程式碼位置，成本最低，但立刻解決打字時整段 remount 的卡頓。
4. ✅ **B1｜`App.js` 三個 Context Provider value 補 `useMemo`（＋ setter 補 `useCallback`）**（`815a96e`）— 槓桿最大的一項：一次修正降低全 App 下游子樹的無謂重繪，且是後續要修 B2（SettingScreen）等下游問題時的前提。`UserContext` 拆分 userType/版更狀態的子問題尚未處理。
5. ✅ **A4｜`reviewService.js` 完成任務的 8 次序列化 AsyncStorage 呼叫改用 `multiGet`/`multiSet`**（`1a56a44`）— 觸發頻率極高（每次打勾都跑），批次化後對電力與感知延遲都有直接幫助。

**2026-07-11 已完成上述前 5 項，均已通過既有 jest 測試套件（23 個測試）驗證，未做實機/模擬器 smoke test。**

其餘項目（B2 SettingScreen 拆分、B4/B5 CalendarGrid/TaskListArea memo 化、C 多語系 eager loading、D iOS Widget 重整策略等）建議視開發排程排入後續迭代，因為影響雖大但需要中至大型改動，不適合塞進單一 commit；F、G 兩類重複程式碼清理則可在下次「順手」修到對應檔案時一併處理，不需要獨立排程。
