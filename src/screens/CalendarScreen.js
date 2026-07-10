import React, {
  useState,
  useEffect,
  useRef,
  useContext,
  useCallback,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Platform,
  Keyboard,
  Dimensions,
  Image,
  StyleSheet,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import {
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { supabase } from "../services/supabaseClient";
import { LanguageContext, ThemeContext, UserContext } from "../contexts";
import { useResponsive } from "../hooks/useResponsive";
import { ResponsiveContainer } from "../components/ResponsiveContainer";
import { TaskService } from "../services/taskService";
import { widgetService } from "../services/widgetService";
import { mixpanelService } from "../services/mixpanelService";
import { reviewService } from "../services/reviewService";
import { cancelTaskNotification } from "../services/notificationService";
import { dataPreloadService } from "../services/dataPreloadService";
import { registerCallbacks, clearCallbacks } from "../utils/navigationCallbacks";
import { format } from "date-fns";
import {
  formatTimestamp,
  parseLocalDateStr,
} from "../utils/dateUtils";
import AdBanner, { ADS_PAUSED } from "../components/AdBanner";
import { BlurView } from "expo-blur";
import { PRIMARY } from "../config/theme";
import { styles } from "./CalendarScreen.styles";
import { CalendarGrid } from "../components/calendar/CalendarGrid";
import { TaskListArea } from "../components/calendar/TaskListArea";
import { EditTaskModal } from "../components/calendar/EditTaskModal";
import { useTaskMove } from "./CalendarScreen/useTaskMove";

function getToday() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function CalendarScreen({ navigation, route }) {
  const { language, t } = useContext(LanguageContext);
  const isZH = language === "zh";
  const { theme, themeMode } = useContext(ThemeContext);
  const { userType, loadingUserType } = useContext(UserContext);
  const insets = useSafeAreaInsets();
  const { isDesktop, isMobile, isTablet } = useResponsive();
  const getCurrentDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [tasks, setTasks] = useState({});
  // 鏡射最新 tasks，讓任務操作 handler 可讀取即時值而不必把 tasks 放進
  // useCallback 依賴（否則 handler 每次 tasks 變動就重建，破壞 TaskItem memo）。
  // 同時比原本讀 render 快照更正確：連續快速操作不會吃到過期的 tasks。
  const tasksRef = useRef({});
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getCurrentDate());
  const [modalVisible, setModalVisible] = useState(false);
  const { moveMode, taskToMove, startMoveTask, dropTaskOnDate } = useTaskMove({
    tasks,
    setTasks,
    selectedDate,
    t,
  });
  const [editingTask, setEditingTask] = useState(null);
  const [visibleMonth, setVisibleMonth] = useState(
    parseLocalDateStr(getCurrentDate()).getMonth(),
  );
  const [visibleYear, setVisibleYear] = useState(
    parseLocalDateStr(getCurrentDate()).getFullYear(),
  );
  const [taskText, setTaskText] = useState("");
  const [taskTime, setTaskTime] = useState("");
  const [taskLink, setTaskLink] = useState("");
  const [taskDate, setTaskDate] = useState(selectedDate);
  const [taskNote, setTaskNote] = useState("");
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [tempDate, setTempDate] = useState(null);
  const [tempTime, setTempTime] = useState(null);
  const taskTitleInputRef = useRef(null);
  const scrollViewRef = useRef(null); // 日曆 ScrollView
  const modalScrollViewRef = useRef(null); // Modal ScrollView
  const fetchedRangesRef = useRef(new Set()); // Track fetched date ranges for caching
  const visibleRangeRef = useRef({
    visibleYear: parseLocalDateStr(getCurrentDate()).getFullYear(),
    visibleMonth: parseLocalDateStr(getCurrentDate()).getMonth(),
  });
  const lastScrollY = useRef(0); // Track last scroll position for month detection
  const scrollTimeoutRef = useRef(null); // Debounce scroll updates
  const isScrollingProgrammatically = useRef(false); // Prevent infinite scroll loop
  const scrollStartY = useRef(0); // Track scroll start position for swipe detection
  const isScrolling = useRef(false); // Track if user is actively scrolling
  const keyboardVisibleRef = useRef(false); // 追蹤鍵盤是否顯示中

  // 保持 tasksRef 與 tasks 同步（涵蓋外部 functional setState 來源：資料
  // 載入 effect、預載入監聽等）。handler 內同步寫入的值會在此被相同值覆蓋，
  // 屬冪等操作。
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  // 追蹤鍵盤顯示狀態，供 picker 掛載時序判斷使用
  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => {
      keyboardVisibleRef.current = true;
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      keyboardVisibleRef.current = false;
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // 若鍵盤正顯示，先收鍵盤並等其完全收起後再掛載 picker overlay。
  // 避免鍵盤收起動畫進行中同時變動 native view 樹，導致 subview 陣列越界
  // (NSRangeException: -[__NSArrayM objectAtIndexedSubscript:]) 而 crash。
  const openPickerAfterKeyboard = useCallback((setVisible) => {
    if (!keyboardVisibleRef.current) {
      setVisible(true);
      return;
    }
    let fallback = null;
    const sub = Keyboard.addListener("keyboardDidHide", () => {
      if (fallback) clearTimeout(fallback);
      sub.remove();
      setVisible(true);
    });
    // 保底：極少數情況 keyboardDidHide 未觸發時仍能開啟 picker
    fallback = setTimeout(() => {
      sub.remove();
      setVisible(true);
    }, 500);
    Keyboard.dismiss();
  }, []);

  // 格式化日期輸入 (YYYY-MM-DD)
  const formatDateInput = (text) => {
    // 移除所有非數字字符
    const numbersOnly = text.replace(/\D/g, "");

    // 限制長度為8位數字 (YYYYMMDD)
    const limitedNumbers = numbersOnly.slice(0, 8);

    // 根據長度添加分隔符
    if (limitedNumbers.length <= 4) {
      return limitedNumbers;
    } else if (limitedNumbers.length <= 6) {
      return `${limitedNumbers.slice(0, 4)}-${limitedNumbers.slice(4)}`;
    } else {
      return `${limitedNumbers.slice(0, 4)}-${limitedNumbers.slice(
        4,
        6,
      )}-${limitedNumbers.slice(6)}`;
    }
  };

  // 格式化時間輸入 (HH:MM)
  const formatTimeInput = (text) => {
    // 移除所有非數字字符
    const numbersOnly = text.replace(/\D/g, "");

    // 限制長度為4位數字 (HHMM)
    const limitedNumbers = numbersOnly.slice(0, 4);

    // 根據長度添加分隔符
    if (limitedNumbers.length <= 2) {
      return limitedNumbers;
    } else {
      return `${limitedNumbers.slice(0, 2)}:${limitedNumbers.slice(2)}`;
    }
  };

  // Web 平台：ESC 鍵關閉 modal，阻止 Enter 鍵觸發 back button
  useEffect(() => {
    if (
      Platform.OS !== "web" ||
      !modalVisible ||
      typeof window === "undefined"
    ) {
      return;
    }

    const handleKeyDown = (event) => {
      // ESC 鍵關閉 modal
      if (event.key === "Escape" || event.keyCode === 27) {
        event.preventDefault();
        setModalVisible(false);
        return;
      }

      // 阻止 Enter 鍵觸發 back button（當焦點不在輸入框或按鈕時）
      if (event.key === "Enter" || event.keyCode === 13) {
        const target = event.target;
        const isInput =
          target.tagName === "INPUT" || target.tagName === "TEXTAREA";
        const isButton =
          target.tagName === "BUTTON" || target.closest("button");

        // 如果焦點不在輸入框或按鈕上，阻止預設行為並將焦點移到輸入框
        if (!isInput && !isButton) {
          event.preventDefault();
          event.stopPropagation();
          // 將焦點移到任務輸入框
          setTimeout(() => {
            if (taskTitleInputRef.current) {
              taskTitleInputRef.current.focus();
            }
          }, 0);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, true); // 使用 capture phase
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [modalVisible]);

  // Web 平台：modal 開啟時自動將焦點放在任務輸入框
  useEffect(() => {
    if (
      Platform.OS === "web" &&
      modalVisible &&
      typeof requestAnimationFrame !== "undefined"
    ) {
      const frame = requestAnimationFrame(() => {
        taskTitleInputRef.current?.focus?.();
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [modalVisible]);

  // Native 平台：modal 開啟時自動將焦點放在任務輸入框
  useEffect(() => {
    if (Platform.OS !== "web" && modalVisible) {
      const timer = setTimeout(() => {
        taskTitleInputRef.current?.focus?.();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [modalVisible]);

  // 同步 taskDate 和 selectedDate
  useEffect(() => {
    if (!modalVisible) {
      setTaskDate(selectedDate);
    } else {
      modalScrollViewRef.current?.scrollTo({ y: 0, animated: false });
    }
  }, [selectedDate, modalVisible]);

  // Track if initial setup is done to avoid duplicate fetches
  const [isInitialized, setIsInitialized] = useState(false);

  // Load tasks from Supabase based on visible range
  useEffect(() => {
    if (!isInitialized) return; // 等待初始化完成

    const fetchTasksForVisibleRange = async () => {
      try {
        // 首先檢查用戶認證狀態
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (!user) {
          console.warn("⚠️ [CalendarScreen] No authenticated user found");
          setTasks({});
          setIsLoadingTasks(false);
          return;
        }

        console.log("✅ [CalendarScreen] User authenticated:", {
          id: user.id,
          email: user.email,
        });

        // Calculate start and end date of the visible month
        // We fetch previous, current, and next month to ensure smooth scrolling
        const startDate = new Date(visibleYear, visibleMonth - 1, 1);
        const endDate = new Date(visibleYear, visibleMonth + 2, 0);

        const startDateStr = format(startDate, "yyyy-MM-dd");
        const endDateStr = format(endDate, "yyyy-MM-dd");

        // Check cache before fetching
        const rangeKey = `${startDateStr}_${endDateStr}`;
        if (fetchedRangesRef.current.has(rangeKey)) {
          console.log(
            `📦 [Cache] Using cached tasks for ${startDateStr} to ${endDateStr}`,
          );
          setIsLoadingTasks(false);
          return; // Skip API call
        }

        setIsLoadingTasks(true);

        // 優先檢查預載入的數據
        // 如果預載入還在進行中，等待它完成（最多等待 3 秒）
        let cachedData = dataPreloadService.getCachedData();

        // 如果沒有緩存數據，檢查預載入是否正在進行中
        if (!cachedData || !cachedData.calendarTasks) {
          // 檢查預載入是否正在進行中（通過檢查 preloadPromise 或 isPreloading）
          // 注意：dataPreloadService 是一個類，preloadPromise 是靜態屬性
          const preloadPromise = dataPreloadService.preloadPromise;
          if (preloadPromise) {
            console.log(
              "⏳ [CalendarScreen] Waiting for preload to complete...",
            );
            try {
              // 等待預載入完成，但設置超時避免無限等待
              const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Preload timeout")), 3000),
              );
              await Promise.race([preloadPromise, timeoutPromise]);
              // 預載入完成後，重新檢查緩存
              cachedData = dataPreloadService.getCachedData();
            } catch (error) {
              // 超時或錯誤時，繼續執行後續的 API 請求
              if (error.message === "Preload timeout") {
                console.log(
                  "⚠️ [CalendarScreen] Preload timeout after 3s, fetching directly",
                );
              } else {
                console.log(
                  "⚠️ [CalendarScreen] Preload error, fetching directly:",
                  error.message,
                );
              }
            }
          }
        }

        // 檢查預載入的數據是否完整涵蓋當前範圍
        const preloadRange = cachedData?.preloadRange;
        const isFullyCovered =
          preloadRange &&
          preloadRange.start <= startDateStr &&
          preloadRange.end >= endDateStr;

        if (
          isFullyCovered &&
          cachedData &&
          cachedData.calendarTasks
        ) {
          // 預載範圍完整涵蓋請求範圍，過濾出當前範圍的任務
          const preloadedTasks = cachedData.calendarTasks;
          const filteredTasks = {};
          Object.keys(preloadedTasks).forEach((date) => {
            const taskDate = parseLocalDateStr(date);
            if (taskDate >= startDate && taskDate <= endDate) {
              filteredTasks[date] = preloadedTasks[date];
            }
          });

          setTasks((prevTasks) => {
            const updatedTasks = {
              ...prevTasks,
              ...filteredTasks,
            };

            // Sync to widget
            widgetService.syncTodayTasks(updatedTasks);

            return updatedTasks;
          });

          setIsLoadingTasks(false);

          // Mark this range as fetched
          fetchedRangesRef.current.add(rangeKey);
          return;
        } else {
          if (__DEV__) console.log(
            `📥 [CalendarScreen] Preload does not fully cover ${startDateStr} to ${endDateStr}, fetching from API`,
          );
        }

        console.log(`Fetching tasks from ${startDateStr} to ${endDateStr}`);

        const newTasks = await TaskService.getTasksByDateRange(
          startDateStr,
          endDateStr,
        );

        if (newTasks === null) {
          // 查詢失敗（非「這段時間真的沒有任務」），不要標記為已抓取，讓下次重試
          console.warn(
            `⚠️ [CalendarScreen] Failed to fetch tasks for ${startDateStr} to ${endDateStr}, will retry`,
          );
          setIsLoadingTasks(false);
          return;
        }

        // Mark this range as fetched
        fetchedRangesRef.current.add(rangeKey);

        setTasks((prevTasks) => {
          const updatedTasks = {
            ...prevTasks,
            ...newTasks,
          };

          // Sync to widget
          widgetService.syncTodayTasks(updatedTasks);

          return updatedTasks;
        });

        setIsLoadingTasks(false);
      } catch (error) {
        console.error("❌ [CalendarScreen] Error loading tasks:", error);
        console.error("❌ [CalendarScreen] Error details:", {
          message: error.message,
          stack: error.stack,
          code: error.code,
        });
        // 即使出錯，也要設置為 false，避免無限載入狀態
        setIsLoadingTasks(false);
        // 嘗試清除緩存並重新載入
        if (
          error.message?.includes("Network") ||
          error.message?.includes("Failed to fetch")
        ) {
          console.warn(
            "⚠️ [CalendarScreen] Network error detected, will retry on next mount",
          );
        }
      }
    };

    fetchTasksForVisibleRange();

    // Cleanup scroll timeout on unmount
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [visibleYear, visibleMonth, isInitialized]);

  // 同步目前可見範圍到 ref，供 preload 更新回調使用
  useEffect(() => {
    visibleRangeRef.current = {
      visibleYear,
      visibleMonth,
    };
  }, [visibleYear, visibleMonth]);

  // 訂閱預載入服務：背景載入前後月完成時合併到畫面的 tasks，解決登入後只顯示當月的問題
  useEffect(() => {
    const handleCalendarTasksUpdated = (newCalendarTasks) => {
      if (!newCalendarTasks || Object.keys(newCalendarTasks).length === 0)
        return;
      const { visibleYear: y, visibleMonth: m } = visibleRangeRef.current;
      const startDate = new Date(y, m - 1, 1);
      const endDate = new Date(y, m + 2, 0);
      const filtered = {};
      Object.keys(newCalendarTasks).forEach((date) => {
        const taskDate = parseLocalDateStr(date);
        if (taskDate >= startDate && taskDate <= endDate) {
          filtered[date] = newCalendarTasks[date];
        }
      });
      if (Object.keys(filtered).length > 0) {
        setTasks((prev) => ({ ...prev, ...filtered }));
      }
    };
    dataPreloadService.addCalendarTasksListener(handleCalendarTasksUpdated);
    return () => {
      dataPreloadService.removeCalendarTasksListener(
        handleCalendarTasksUpdated,
      );
    };
  }, []);

  // Center calendar to today (only called on init, not when month changes)
  const centerToday = useCallback(() => {
    if (!scrollViewRef.current) return;
    const todayDate = parseLocalDateStr(getToday());
    todayDate.setHours(12, 0, 0, 0);
    const currentMonth = parseLocalDateStr(getCurrentDate()).getMonth();
    const currentYear = parseLocalDateStr(getCurrentDate()).getFullYear();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const firstDayOfWeek = firstDayOfMonth.getDay();
    const firstSunday = new Date(firstDayOfMonth);
    firstSunday.setDate(firstDayOfMonth.getDate() - firstDayOfWeek);
    const diffInDays = Math.floor(
      (todayDate - firstSunday) / (1000 * 60 * 60 * 24),
    );
    const weekNumber = Math.floor(diffInDays / 7);
    const weekHeight = 50;
    const scrollPosition = Math.max(0, weekNumber * weekHeight - weekHeight);
    scrollViewRef.current.scrollTo({
      y: scrollPosition,
      animated: true,
    });
  }, []); // 移除依賴，只在初始化時調用

  // Initialize calendar to today when app loads/reloads
  useEffect(() => {
    if (isInitialized) {
      console.log("⏭️ Initialization skipped - already initialized");
      return; // 已經初始化過，不再執行
    }

    console.log("🚀 Initializing calendar to today");
    const today = getCurrentDate();
    const todayDate = parseLocalDateStr(today);
    const todayMonth = todayDate.getMonth();
    const todayYear = todayDate.getFullYear();

    console.log("📅 Setting initial month/year:", todayMonth, todayYear);
    setSelectedDate(today);
    setVisibleMonth(todayMonth);
    setVisibleYear(todayYear);

    // 等待預載入完成後再檢查快取（避免太早檢查導致 cache miss 後重複查詢）
    const initWithPreload = async () => {
      // 如果預載入正在進行中，等待它完成（最多 3 秒）
      if (
        dataPreloadService.isPreloading &&
        dataPreloadService.preloadPromise
      ) {
        console.log("⏳ [CalendarScreen] Waiting for preload before init...");
        try {
          await Promise.race([
            dataPreloadService.preloadPromise,
            new Promise((resolve) => setTimeout(resolve, 3000)),
          ]);
        } catch (error) {
          console.warn(
            "⚠️ [CalendarScreen] Preload wait error during init:",
            error.message,
          );
        }
      }

      const cachedData = dataPreloadService.getCachedData();
      if (
        cachedData &&
        cachedData.calendarTasks &&
        Object.keys(cachedData.calendarTasks).length > 0
      ) {
        console.log("📦 [CalendarScreen] Using preloaded tasks on mount");
        const preloadedTasks = cachedData.calendarTasks;

        // 計算當前可見範圍
        const startDate = new Date(todayYear, todayMonth - 1, 1);
        const endDate = new Date(todayYear, todayMonth + 2, 0);

        // 過濾出當前範圍的任務
        const filteredTasks = {};
        Object.keys(preloadedTasks).forEach((date) => {
          const taskDate = parseLocalDateStr(date);
          if (taskDate >= startDate && taskDate <= endDate) {
            filteredTasks[date] = preloadedTasks[date];
          }
        });

        if (Object.keys(filteredTasks).length > 0) {
          console.log(
            `✅ [CalendarScreen] Loaded ${
              Object.keys(filteredTasks).length
            } dates with tasks from cache`,
          );
          setTasks(filteredTasks);
          setIsLoadingTasks(false);

          // 標記這個範圍已經獲取
          const startDateStr = format(startDate, "yyyy-MM-dd");
          const endDateStr = format(endDate, "yyyy-MM-dd");
          const rangeKey = `${startDateStr}_${endDateStr}`;
          fetchedRangesRef.current.add(rangeKey);
        } else {
          console.log(
            "⚠️ [CalendarScreen] Preloaded tasks exist but none in current range, will fetch from API",
          );
        }
      } else {
        console.log(
          "📥 [CalendarScreen] No preloaded tasks available, will fetch from API",
        );
      }

      // 標記初始化完成（無論是否有預載入數據）
      console.log("✅ [CalendarScreen] Initialization complete");
      setIsInitialized(true);
    };

    initWithPreload();

    // Center calendar to today after state is set
    setTimeout(() => {
      centerToday();
    }, 500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerToday]);

  // Reset to today when Calendar tab is focused (but avoid duplicate fetches)
  useFocusEffect(
    React.useCallback(() => {
      const today = getCurrentDate();
      const todayDate = parseLocalDateStr(today);
      const todayMonth = todayDate.getMonth();
      const todayYear = todayDate.getFullYear();

      // Check if focusToday param is passed (e.g., when session expired)
      const shouldFocusToday = route?.params?.focusToday;

      // Only update if shouldFocusToday is true (explicit request to focus today)
      // Don't reset month/year if user has navigated to a different month
      if (shouldFocusToday) {
        setSelectedDate(today);
        setVisibleMonth(todayMonth);
        setVisibleYear(todayYear);
        setTimeout(() => {
          centerToday();
        }, 100);
      }
    }, [route?.params?.focusToday, centerToday]),
  );

  // Task state changes from TaskDetailScreen are now handled via callbacks passed in openEditTask

  // Note: We no longer need to save tasks to AsyncStorage
  // Tasks are automatically saved to Supabase when modified

  const openAddTask = (date) => {
    setEditingTask(null);
    setTaskText("");
    setTaskTime("");
    setTaskLink("");
    setTaskDate(date);
    setTaskNote("");
    setSelectedDate(date);
    setModalVisible(true);
  };

  // Helper function to clear task cache when tasks are modified
  const clearTaskCache = useCallback(() => {
    fetchedRangesRef.current.clear();
    console.log("🗑️ [Cache] Cleared task cache");
  }, []);

  const openEditTask = useCallback((task) => {
    const callbackId = `task_${task.id}`;
    registerCallbacks(callbackId, {
      onDelete: (deletedId, deletedDate) => {
        setTasks((prev) => {
          const dayList = (prev[deletedDate] || []).filter((t) => t.id !== deletedId);
          const newTasks = { ...prev, [deletedDate]: dayList };
          widgetService.syncTodayTasks(newTasks);
          dataPreloadService.updateCachedCalendarTasks(newTasks);
          return newTasks;
        });
        clearTaskCache();
        clearCallbacks(callbackId);
      },
      onUpdate: (updatedTask) => {
        setTasks((prev) => {
          const existsInTarget = (prev[updatedTask.date] || []).some(
            (t) => t.id === updatedTask.id,
          );
          let newTasks;
          if (existsInTarget) {
            // 同日期編輯：原地更新，保留排序
            newTasks = {
              ...prev,
              [updatedTask.date]: (prev[updatedTask.date] || []).map((t) =>
                t.id === updatedTask.id ? updatedTask : t,
              ),
            };
          } else {
            // 日期搬移：先從所有日期移除，再加入新日期，避免任務憑空消失
            newTasks = {};
            for (const [date, list] of Object.entries(prev)) {
              newTasks[date] = list.filter((t) => t.id !== updatedTask.id);
            }
            newTasks[updatedTask.date] = [
              ...(newTasks[updatedTask.date] || []),
              updatedTask,
            ];
          }
          widgetService.syncTodayTasks(newTasks);
          dataPreloadService.updateCachedCalendarTasks(newTasks);
          return newTasks;
        });
        clearTaskCache();
        clearCallbacks(callbackId);
      },
    });
    navigation.navigate("TaskDetail", {
      task,
      dayTasks: tasksRef.current[task.date] || [],
      callbackId,
    });
  }, [navigation, clearTaskCache]);

  const saveTask = async () => {
    if (taskText.trim() === "") return;
    if (taskDate.trim() === "") return;

    const targetDate = taskDate || selectedDate;
    const previousTasks = { ...tasks }; // Backup for rollback
    let tempId = null;

    // Prepare task data
    const taskData = {
      title: taskText,
      time: taskTime,
      link: taskLink,
      date: targetDate,
      note: taskNote,
    };

    // 1. Optimistic Update
    if (editingTask) {
      const updatedTask = { ...editingTask, ...taskData };

      if (editingTask.date !== targetDate) {
        // Date changed
        const oldDayTasks = tasks[editingTask.date] || [];
        const newOldDayTasks = oldDayTasks.filter(
          (t) => t.id !== editingTask.id,
        );
        const newDayTasks = tasks[targetDate] || [];
        const updatedNewDayTasks = [...newDayTasks, updatedTask];

        const newTasksState = {
          ...tasks,
          [editingTask.date]: newOldDayTasks,
          [targetDate]: updatedNewDayTasks,
        };
        setTasks(newTasksState);
        widgetService.syncTodayTasks(newTasksState);
        dataPreloadService.updateCachedCalendarTasks(newTasksState);
      } else {
        // Same date
        const dayTasks = tasks[targetDate] || [];
        const updatedDayTasks = dayTasks.map((t) =>
          t.id === editingTask.id ? updatedTask : t,
        );
        const newTasksState = { ...tasks, [targetDate]: updatedDayTasks };
        setTasks(newTasksState);
        widgetService.syncTodayTasks(newTasksState);
        dataPreloadService.updateCachedCalendarTasks(newTasksState);
      }
    } else {
      // Create new task
      tempId = `temp-${Date.now()}`;
      const newTask = {
        id: tempId,
        ...taskData,
        is_completed: false,
      };

      const dayTasks = tasks[targetDate] || [];
      const newTasksState = { ...tasks, [targetDate]: [...dayTasks, newTask] };
      setTasks(newTasksState);
      // widget sync 延後到 API 回應並取得真實 ID 後再執行（line 993）
    }

    // Close modal immediately
    setModalVisible(false);
    const currentEditingTask = editingTask; // Capture for async use
    setEditingTask(null);
    setTaskText("");
    setTaskTime("");
    setTaskLink("");
    setTaskDate(selectedDate);
    setTaskNote("");

    try {
      // 2. Perform Background Operations
      if (currentEditingTask) {
        // --- UPDATE TASK ---
        console.log("Updating existing task:", currentEditingTask.id);

        // Check if it's a temporary task
        if (String(currentEditingTask.id).startsWith("temp-")) {
          console.log(
            "Updating temporary task locally:",
            currentEditingTask.id,
          );
          return; // Skip API call, the create flow will handle the sync
        }

        // API Call — TaskService.updateTask 內部會處理提醒通知的取消/重新排程
        const updatedTaskFromServer = await TaskService.updateTask(
          currentEditingTask.id,
          taskData,
          t,
        );

        // Mixpanel
        mixpanelService.track("Task Updated", {
          task_id: currentEditingTask.id,
          has_time: !!taskTime,
          has_link: !!taskLink,
          has_note: !!taskNote,
          date_changed: currentEditingTask.date !== targetDate,
          platform: Platform.OS,
        });

        // Clear cache after update
        clearTaskCache();
      } else {
        // --- CREATE TASK ---
        // API Call — TaskService.addTask 內部會處理提醒通知的排程
        const createdTask = await TaskService.addTask(
          {
            ...taskData,
            is_completed: false,
          },
          t,
        );

        // Clear cache after creation
        clearTaskCache();

        // Replace temp ID with real ID and handle any pending actions/changes
        setTasks((currentTasks) => {
          // Check if task was deleted while creating
          if (pendingTempActions.current[tempId] === "delete") {
            console.log(
              "Task deleted while creating, deleting from server:",
              createdTask.id,
            );
            TaskService.deleteTask(createdTask.id).catch((e) =>
              console.error("Failed to delete ghost task", e),
            );

            // Remove from state if it exists
            const dayTasks = currentTasks[targetDate] || [];
            const filteredTasks = dayTasks.filter((t) => t.id !== tempId);
            const updatedTasksState = {
              ...currentTasks,
              [targetDate]: filteredTasks,
            };
            widgetService.syncTodayTasks(updatedTasksState);
            dataPreloadService.updateCachedCalendarTasks(updatedTasksState);
            return updatedTasksState;
          }

          const dayTasks = currentTasks[targetDate] || [];
          // Find the current state of this task (it might have been edited or toggled)
          const currentTempTask = dayTasks.find((t) => t.id === tempId);

          if (!currentTempTask) {
            // Task not found in state? Maybe moved date?
            // For now, just return currentTasks, but this is an edge case.
            return currentTasks;
          }

          // Merge server data with local changes
          // We keep the real ID from server
          // We take other fields from local state to preserve edits/toggles
          const finalTask = {
            ...createdTask,
            ...currentTempTask,
            id: createdTask.id,
          };

          // Sync changes to server if local state diverged from initial creation
          const needsUpdate =
            finalTask.title !== createdTask.title ||
            finalTask.date !== createdTask.date ||
            finalTask.time !== createdTask.time ||
            finalTask.link !== createdTask.link ||
            finalTask.note !== createdTask.note;

          const needsToggle =
            finalTask.is_completed !== createdTask.is_completed;

          if (needsUpdate) {
            console.log("Syncing pending updates for new task");
            TaskService.updateTask(createdTask.id, {
              title: finalTask.title,
              date: finalTask.date,
              time: finalTask.time,
              link: finalTask.link,
              note: finalTask.note,
            }).catch((e) => console.error("Failed to sync update", e));
          }

          if (needsToggle) {
            console.log("Syncing pending toggle for new task");
            TaskService.toggleTaskChecked(
              createdTask.id,
              finalTask.is_completed,
            ).catch((e) => console.error("Failed to sync toggle", e));
          }

          const updatedDayTasks = dayTasks.map((t) =>
            t.id === tempId ? finalTask : t,
          );
          const updatedTasksState = {
            ...currentTasks,
            [targetDate]: updatedDayTasks,
          };

          // Sync widget again with real ID
          widgetService.syncTodayTasks(updatedTasksState);
          dataPreloadService.updateCachedCalendarTasks(updatedTasksState);

          return updatedTasksState;
        });

        // Mixpanel
        mixpanelService.track("Task Created", {
          task_id: createdTask.id,
          has_time: !!taskTime,
          has_link: !!taskLink,
          has_note: !!taskNote,
          platform: Platform.OS,
        });
      }
    } catch (error) {
      console.error("Error saving task:", error);
      // 3. Rollback
      setTasks(previousTasks);
      widgetService.syncTodayTasks(previousTasks);
      dataPreloadService.updateCachedCalendarTasks(previousTasks);
      Alert.alert(t.error, t.saveTaskFailed);
    }
  };

  const showDeleteConfirm = () => {
    // Web 平台使用原生 confirm，其他平台使用 Alert.alert
    if (Platform.OS === "web") {
      const confirmed = window.confirm(t.deleteConfirm);
      if (confirmed) {
        deleteTask();
      }
    } else {
      Alert.alert(
        t.deleteConfirm,
        "",
        [
          {
            text: t.cancel,
            onPress: () => {},
            style: "cancel",
          },
          {
            text: t.delete,
            onPress: deleteTask,
            style: "destructive",
          },
        ],
        { cancelable: true },
      );
    }
  };

  // Ref to track pending actions for temporary tasks
  const pendingTempActions = useRef({});

  const deleteTask = async () => {
    if (!editingTask) return;

    // Mixpanel: Track task deletion
    const taskAgeMs = editingTask.created_at
      ? Date.now() - new Date(editingTask.created_at).getTime()
      : null;
    const taskAgeDays = taskAgeMs
      ? Math.floor(taskAgeMs / (1000 * 60 * 60 * 24))
      : null;

    mixpanelService.track("Task Deleted", {
      task_id: editingTask.id,
      was_completed: !!editingTask.isCompleted,
      had_time: !!editingTask.time,
      had_link: !!editingTask.link,
      had_note: !!editingTask.note,
      task_age_days: taskAgeDays,
    });

    // 1. Optimistic Update: Remove from UI immediately
    const day = editingTask.date;
    const previousTasks = { ...tasks }; // Backup for rollback
    const dayTasks = tasks[day] ? [...tasks[day]] : [];
    const filteredTasks = dayTasks.filter((t) => t.id !== editingTask.id);
    const newTasks = { ...tasks, [day]: filteredTasks };

    setTasks(newTasks);
    widgetService.syncTodayTasks(newTasks);
    dataPreloadService.updateCachedCalendarTasks(newTasks);

    // Close modal immediately
    setModalVisible(false);
    setEditingTask(null);
    setTaskText("");
    setTaskTime("");
    setTaskLink("");
    setTaskDate(selectedDate);
    setTaskNote("");

    // Check if it's a temporary task
    if (String(editingTask.id).startsWith("temp-")) {
      console.log("Deleting temporary task locally:", editingTask.id);
      pendingTempActions.current[editingTask.id] = "delete";
      return; // Skip API call
    }

    try {
      // 2. Perform Background Operation
      // Cancel notification if exists（用確定性 ID 查找，不依賴本地是否記錄過 notificationIds）
      await cancelTaskNotification(null, editingTask.id);

      await TaskService.deleteTask(editingTask.id);

      // Clear cache after deletion
      clearTaskCache();
    } catch (error) {
      console.error("Error deleting task:", error);
      // 3. Rollback on Failure
      setTasks(previousTasks);
      widgetService.syncTodayTasks(previousTasks);
      dataPreloadService.updateCachedCalendarTasks(previousTasks);
      Alert.alert(t.error, t.deleteTaskFailed);
    }
  };

  const toggleTaskChecked = useCallback(async (task) => {
    const newCompletedState = !task.is_completed;
    const previousTasks = tasksRef.current; // Backup for rollback（即時值）

    // 1. Optimistic Update: Update UI immediately
    const dayTasks = previousTasks[task.date]
      ? [...previousTasks[task.date]]
      : [];
    const updatedTasksList = dayTasks.map((t) =>
      t.id === task.id
        ? {
            ...t,
            is_completed: newCompletedState,
          }
        : t,
    );
    const newTasksState = { ...previousTasks, [task.date]: updatedTasksList };

    tasksRef.current = newTasksState; // 同步更新，確保連續操作以最新狀態為基準
    setTasks(newTasksState);
    widgetService.syncTodayTasks(newTasksState);
    dataPreloadService.updateCachedCalendarTasks(newTasksState);

    // Check if it's a temporary task
    if (String(task.id).startsWith("temp-")) {
      console.log("Toggling temporary task locally:", task.id);
      return; // Skip API call, the create flow will handle the sync
    }

    try {
      // 2. Perform Background Operation
      // If task is being marked as completed, cancel notification
      if (newCompletedState) {
        if (task.notificationIds) {
          await cancelTaskNotification(task.notificationIds);
        } else if (task.notificationId) {
          await cancelTaskNotification(task.notificationId);
        }
      }

      await TaskService.toggleTaskChecked(task.id, newCompletedState);

      // Mixpanel: Track event
      mixpanelService.track(
        newCompletedState ? "Task Completed" : "Task Uncompleted",
        {
          task_id: task.id,
          platform: Platform.OS,
        },
      );

      // 爽點時刻：完成待辦後，在符合條件時請求 App Store 評分
      if (newCompletedState) {
        reviewService.recordTaskCompletionAndMaybePrompt();
      }
    } catch (error) {
      console.error("Error toggling task:", error);
      // 3. Rollback on Failure
      tasksRef.current = previousTasks;
      setTasks(previousTasks);
      widgetService.syncTodayTasks(previousTasks);
      dataPreloadService.updateCachedCalendarTasks(previousTasks);
      Alert.alert(t.error, t.updateTaskFailed);
    }
  }, [t]);

  const calendarContent = (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <CalendarGrid
        theme={theme}
        t={t}
        language={language}
        visibleYear={visibleYear}
        setVisibleYear={setVisibleYear}
        visibleMonth={visibleMonth}
        setVisibleMonth={setVisibleMonth}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        tasks={tasks}
        moveMode={moveMode}
        taskToMove={taskToMove}
        dropTaskOnDate={dropTaskOnDate}
        getCurrentDate={getCurrentDate}
        scrollViewRef={scrollViewRef}
      />
      <View
        style={[
          styles.taskAreaContainer,
          {
            backgroundColor: theme.background,
            // 僅在廣告實際會顯示時才保留底部空間；ADS_PAUSED 時 AdBanner 回傳 null，
            // 若仍保留 58px 會出現一塊空白色塊（無廣告卻佔位）
            paddingBottom:
              !ADS_PAUSED && !loadingUserType && userType === "general"
                ? 58
                : 0,
          },
        ]}
      >
        <TaskListArea
          theme={theme}
          t={t}
          isZH={isZH}
          tasks={tasks}
          isLoadingTasks={isLoadingTasks}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          moveMode={moveMode}
          taskToMove={taskToMove}
          onToggle={toggleTaskChecked}
          onEdit={openEditTask}
          onStartMove={startMoveTask}
          onAddTask={openAddTask}
        />
      </View>
      {/* Banner Ad 固定底部，general 一進日曆即可見 */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          alignItems: "center",
        }}
      >
        <AdBanner
          position="bottom"
          size="banner"
          userType={userType}
          loadingUserType={loadingUserType}
        />
      </View>
      <EditTaskModal
        theme={theme}
        t={t}
        isZH={isZH}
        insets={insets}
        themeMode={themeMode}
        modalVisible={modalVisible}
        setModalVisible={setModalVisible}
        editingTask={editingTask}
        taskText={taskText}
        setTaskText={setTaskText}
        taskTime={taskTime}
        setTaskTime={setTaskTime}
        taskLink={taskLink}
        setTaskLink={setTaskLink}
        taskDate={taskDate}
        setTaskDate={setTaskDate}
        taskNote={taskNote}
        setTaskNote={setTaskNote}
        taskTitleInputRef={taskTitleInputRef}
        modalScrollViewRef={modalScrollViewRef}
        saveTask={saveTask}
        showDeleteConfirm={showDeleteConfirm}
        openPickerAfterKeyboard={openPickerAfterKeyboard}
        datePickerVisible={datePickerVisible}
        setDatePickerVisible={setDatePickerVisible}
        tempDate={tempDate}
        setTempDate={setTempDate}
        timePickerVisible={timePickerVisible}
        setTimePickerVisible={setTimePickerVisible}
        tempTime={tempTime}
        setTempTime={setTempTime}
      />
    </View>
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.background }}
      edges={["top"]}
    >
      <ResponsiveContainer style={{ flex: 1 }}>
        {Platform.OS === "web" ? (
          calendarContent
        ) : (
          <GestureHandlerRootView
            style={[styles.container, { backgroundColor: theme.background }]}
          >
            {calendarContent}
          </GestureHandlerRootView>
        )}
      </ResponsiveContainer>
    </SafeAreaView>
  );
}


export default CalendarScreen;
