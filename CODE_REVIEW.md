# TaskCal 產品程式碼健檢報告

**範圍**：全 codebase（src/ 約 19,200 行 JS + Supabase Edge Functions + iOS Widget 同步層）
**日期**：2026-07-10
**方式**：AI 全面審查（安全性、功能/風險、資料結構、效率、可維護性）＋ 已修復項目的實機驗證

---

## 總評

| 面向 | 評分 | 一句話 |
|------|------|--------|
| 安全性 | 🟢 已修復關鍵項 | unsubscribe IDOR、trigger function 公開權限已修 |
| 功能穩健性 | 🟢 已修復關鍵項 | 通知/Widget 清除/查詢失敗誤判/重複排程/空標題已修 |
| 資料結構 | 🟢 已修復 | `checked`/`is_completed` 雙欄位已收斂為單欄位 |
| 效能 | 🟢 已修復熱點 | CalendarScreen 任務列表已 memo 化 |
| 可維護性 | 🟡 已建立測試基礎 | 有 jest 環境 + 19 個測試，巨型檔案拆分未做 |

---

## ✅ 已修復項目

### 🔒 安全性

| 項目 | 說明 | Commit |
|------|------|--------|
| unsubscribe endpoint IDOR | 任何人拿到使用者 uid 即可修改其 metadata；改為 HMAC-SHA256 簽名驗證（`uid`+`sig`），需設定 `UNSUBSCRIBE_SECRET` 環境變數 | `e770ad8` |
| SECURITY DEFINER function 公開權限 | `handle_new_user()`、`update_updated_at_column()` 兩個 trigger function 原本 anon/authenticated 可透過 `/rest/v1/rpc/` 直接呼叫；已 REVOKE EXECUTE | 已套用到正式 Supabase 專案（migration 依專案慣例不進 git，`*.sql` 被 gitignore） |
| `tasks` 表 RLS | 經 Supabase security advisor 確認未被標記缺少 RLS，現有保護有效，無需修改 | — |

**未處理**：Leaked Password Protection 需要 Supabase Pro 方案，已確認跳過。

### ⚙️ 功能與風險

| 項目 | 說明 | Commit |
|------|------|--------|
| 完成任務不取消提醒通知 | `toggleTaskChecked` 只更新 `is_completed`，未觸發通知取消邏輯，導致使用者完成任務後仍收到提醒；已修正為完成時取消、取消完成且仍有時間時視設定重新排程 | `a8c45ca` |
| Widget 登出後未清除（key/格式錯誤） | `clearWidgetData()` 原本寫錯 key（`"todayTasks"` 而非實際的 `"widgetTasksByDate"`）、格式也不對（陣列而非物件） | `1d5e7a2` |
| Widget 登出後未清除（根因：監聽器已卸載） | 清除邏輯原本掛在 `SplashScreen` 的 `SIGNED_OUT` 監聽器上，但 `SplashScreen` 在登入成功後會被 `navigation.reset()` 卸載，之後從 `SettingScreen` 登出時監聽器早已不存在，事件無人接收。改為直接寫在 `SettingScreen.handleLogout`、dev Force Logout 按鈕、`UserService.deleteUser` 三處實際觸發登出的地方 | `64466d2`（已實機驗證：登出後 Widget 正確顯示 "All clear today"） |
| F3｜查詢失敗與空資料無法區分 | `taskService.getTasksByDateRange` 查詢失敗一律回傳 `{}`，`{}` 同時代表「失敗」與「這段時間真的沒任務」，呼叫端無法區分，網路失敗時會把 Widget 洗成空白。改為失敗回傳 `null`（`{}` 只保留給真正的空資料）；`dataPreloadService.preloadAllData` 收到 `null` 時保留舊快取並跳過 Widget 同步；`CalendarScreen` 的區間抓取收到 `null` 時不標記為已抓取，下次會重試 | `9c896a5` |
| D3｜preload 快取編輯後不會回寫 | `dataPreloadService.preloadCache.calendarTasks` 有 5 分鐘 TTL，但 CalendarScreen 的任務 CRUD（新增/編輯/刪除/勾選/搬移）只更新自己的 state，沒有回寫 preload 快取；若使用者在 TTL 內切到其他 tab 再切回 CalendarScreen，會用快取覆蓋掉剛編輯過的任務。新增 `dataPreloadService.updateCachedCalendarTasks(tasksByDate)`，在 CalendarScreen 所有 13 個 CRUD 成功/樂觀更新/rollback 點（與既有 `widgetService.syncTodayTasks` 呼叫並列）同步把當下完整任務狀態 merge 回 preload 快取（含衍生的 `todayTasks`/`currentMonthTasks`） | `b526811` |
| F2｜新增/編輯任務重複排程通知 | `CalendarScreen` 在呼叫 `taskService.addTask`/`updateTask` 之後，自己又呼叫一次 `scheduleTaskNotification`，後呼叫者會覆蓋前者（cancel-then-reschedule）。實測發現不只是冗餘：`CalendarScreen` 端用寫死的 `getActiveReminderMinutes()`、且 `userReminderSettings` 永遠傳 `null`，導致使用者關閉提醒仍會收到通知、自訂多個提醒時間點會被砍成只剩一個。改為只保留 `taskService` 內部那次排程（唯一正確檢查 `enabled` 與讀取 `reminder_settings.times` 的地方），新增 `translations` 參數讓畫面端可傳入語言 context 維持通知文字多語系；同步把 `CalendarScreen` 刪除任務時取消通知的邏輯改用確定性 taskId 查找，避免依賴不再寫入的本地 `notificationIds` | `1ac96b9` |
| F4｜`updateTask` 把空字串 title 轉成 null | `cleanedUpdates` 邏輯對所有字串欄位一視同仁，會把空字串轉成 `null` 再寫入 DB，`title` 這個必填欄位沒有例外處理。目前所有 UI 呼叫端都已在畫面層擋空標題，問題尚未實際發生，但服務層本身缺乏對應防線。新增服務層防線：`title` 為空字串時不寫入該欄位（保留原值），與 `addTask` 既有的必填驗證對齊 | `593e80c` |

### 🗄️ 資料結構

| 項目 | 說明 | Commit |
|------|------|--------|
| D1｜`checked`/`is_completed` 雙欄位滲透全 codebase | `task.is_completed \|\| task.checked \|\| false` 這個 fallback pattern 在 `taskTypes.js`、`taskService.js`（5 處回傳點）、`widgetService.js`、`CalendarScreen.js`、`TaskDetailScreen.js` 共 7 個檔案重複出現。調查確認 Supabase DB 與 iOS Swift Widget 端都早已只用 `is_completed`／`completed`，雙欄位只存在於 JS 服務層回傳物件與畫面 state，沒有資料遺失風險，純粹是冗余。已移除所有 `checked` 讀取/雙寫，前端全面改為只用 `is_completed` 單一事實來源；同步更新 `taskTypes.test.js`、`taskService.test.js` 移除「legacy checked fallback」測試案例 | `c5fb44e` |

### ⚡ 效能

| 項目 | 說明 | Commit |
|------|------|--------|
| CalendarScreen 任務列表無 memoization | 原本 66 個 useState、0 個 useMemo、僅 4 個 useCallback，任一 state 變動（如 Modal 打字）都會重繪整份任務清單。抽出 `TaskItem`（React.memo）模組層元件，`toggleTaskChecked`/`openEditTask`/`startMoveTask` 改用 `useCallback` 穩定引用，並導入 `tasksRef` 鏡射最新 tasks（handler 讀 ref 而非閉包快照，避免 stale closure 造成資料覆蓋風險，同時比原寫法更正確） | `2d07c3b` |

### 🧹 可維護性

| 項目 | 說明 | Commit |
|------|------|--------|
| 零測試覆蓋 | 建立 jest-expo 測試環境（`npm test`），針對本次修復涉及的高風險邏輯補上回歸測試（目前累計 23 個）：`taskTypes` 欄位驗證、`taskService` 的 temp-id guard、通知取消/重排/多語系傳遞、title 空值防線、`widgetService` 的排序格式與 clear 邏輯 | `225dc7c` 起累計 |
| （附帶修復）npm --legacy-peer-deps 誤刪相依套件 | 安裝 jest 時誤用該旗標，導致 `react-native-worklets`（reanimated 4.x 必需的 peer dependency）被移除，babel/build 全面失敗；已重新安裝並固定為直接依賴 | `225dc7c` |

---

## 🔲 尚待處理項目

### 可維護性（🔴 高工作量，未做）

- **CalendarScreen 檔案拆分**：4489 行的巨型檔案本次只做了效能 memo 化，沒有做拆分重構（日曆本體、任務清單、編輯 Modal、拖曳邏輯分離）。建議在有更完整測試覆蓋或可互動驗證環境時再進行，風險較高。
- **SettingScreen（2511 行）、SplashScreen（2207 行）**：本次審查未深入這兩支檔案的效能/結構問題，僅在通用掃描中列為候選熱點。

---

## 追蹤建議

- 上述「尚待處理」項目風險相對較低，可視開發排程逐項處理，比照本次做法一項一 commit。
- CalendarScreen 拆分建議獨立列為一個工作階段，且需要實機 smoke test（無自動化 UI 測試覆蓋）。
- 之後每次修這份清單裡的項目，建議同步更新本檔案的狀態。
