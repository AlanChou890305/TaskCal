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
  ScrollView,
  TextInput,
  Modal,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  Linking,
  Dimensions,
  Image,
  StyleSheet,
  FlatList,
  Animated,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import {
  GestureHandlerRootView,
  PanGestureHandler,
  State,
} from "react-native-gesture-handler";
import DateTimePicker from "@react-native-community/datetimepicker";
import Svg, { Line, Circle, Rect } from "react-native-svg";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { supabase } from "../services/supabaseClient";
import { LanguageContext, ThemeContext, UserContext } from "../contexts";
import { useResponsive } from "../hooks/useResponsive";
import { ResponsiveContainer } from "../components/ResponsiveContainer";
import { MapPreview } from "../components/MapPreview";
import { TaskService } from "../services/taskService";
import { widgetService } from "../services/widgetService";
import { mixpanelService } from "../services/mixpanelService";
import {
  scheduleTaskNotification,
  cancelTaskNotification,
} from "../services/notificationService";
import { getActiveReminderMinutes } from "../config/notificationConfig";
import { dataPreloadService } from "../services/dataPreloadService";
import { format } from "date-fns";
import {
  formatTimestamp,
  formatTimeDisplay as formatTimeDisplayUtil,
} from "../utils/dateUtils";
import AdBanner from "../components/AdBanner";
import IOSButton from "../components/IOSButton";
import { BlurView } from "expo-blur";
import { PRIMARY } from "../config/theme";
import { isIOS26Plus } from "../utils/platform";
import IndigoFAB from "../components/IndigoFAB";
import IOSCheckbox from "../components/IOSCheckbox";

function getToday() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// 格式化時間為 HH:MM（移除秒數）
// 使用工具文件中的函數，保持向後兼容
const formatTimeDisplay = formatTimeDisplayUtil;

const SKELETON_WIDTHS = ["58%", "72%", "46%", "65%"];

const TaskSkeleton = ({ theme, widthIndex = 0 }) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const useNativeDriver = Platform.OS !== "web";
  const isDark = theme.mode === "dark";

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1400,
        useNativeDriver,
      }),
    ).start();
  }, []);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-250, 250],
  });

  const baseBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(26,31,46,0.07)";
  const highlightBg = isDark ? "rgba(255,255,255,0.14)" : "rgba(26,31,46,0.14)";

  const SkBlock = ({ width, height, borderRadius = 4 }) => (
    <View style={{ overflow: "hidden", backgroundColor: baseBg, borderRadius, width, height }}>
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          width: 150,
          backgroundColor: highlightBg,
          transform: [{ translateX }],
        }}
      />
    </View>
  );

  const titleW = SKELETON_WIDTHS[widthIndex % SKELETON_WIDTHS.length];

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 13,
        paddingHorizontal: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.rule || theme.divider,
        backgroundColor: theme.background,
        gap: 12,
      }}
    >
      <SkBlock width={20} height={20} borderRadius={3} />
      <View style={{ flex: 1 }}>
        <SkBlock width={titleW} height={12} />
      </View>
      <SkBlock width={32} height={10} />
    </View>
  );
};

function CalendarScreen({ navigation, route }) {
  const { language, t } = useContext(LanguageContext);
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
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getCurrentDate());
  const [modalVisible, setModalVisible] = useState(false);
  const [moveMode, setMoveMode] = useState(false);
  const [taskToMove, setTaskToMove] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [visibleMonth, setVisibleMonth] = useState(
    new Date(getCurrentDate()).getMonth(),
  );
  const [visibleYear, setVisibleYear] = useState(
    new Date(getCurrentDate()).getFullYear(),
  );
  const [taskText, setTaskText] = useState("");
  const [taskTime, setTaskTime] = useState("");
  const [taskLink, setTaskLink] = useState("");
  const [taskDate, setTaskDate] = useState(selectedDate);
  const [taskNote, setTaskNote] = useState("");
  const [noteInputHeight, setNoteInputHeight] = useState(100); // 動態高度，初始 100
  const [linkInputFocused, setLinkInputFocused] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [tempDate, setTempDate] = useState(null);
  const [tempTime, setTempTime] = useState(null);
  const taskTitleInputRef = useRef(null);
  const scrollViewRef = useRef(null); // 日曆 ScrollView
  const modalScrollViewRef = useRef(null); // Modal ScrollView
  const fetchedRangesRef = useRef(new Set()); // Track fetched date ranges for caching
  const visibleRangeRef = useRef({
    visibleYear: new Date(getCurrentDate()).getFullYear(),
    visibleMonth: new Date(getCurrentDate()).getMonth(),
  });
  const lastScrollY = useRef(0); // Track last scroll position for month detection
  const scrollTimeoutRef = useRef(null); // Debounce scroll updates
  const isScrollingProgrammatically = useRef(false); // Prevent infinite scroll loop
  const scrollStartY = useRef(0); // Track scroll start position for swipe detection
  const isScrolling = useRef(false); // Track if user is actively scrolling

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

        // 檢查預載入的數據是否包含當前範圍的任務
        if (
          cachedData &&
          cachedData.calendarTasks &&
          Object.keys(cachedData.calendarTasks).length > 0
        ) {
          // 檢查預載入的任務是否涵蓋當前範圍
          const preloadedTasks = cachedData.calendarTasks;
          const hasTasksInRange = Object.keys(preloadedTasks).some((date) => {
            const taskDate = new Date(date);
            return taskDate >= startDate && taskDate <= endDate;
          });

          if (hasTasksInRange) {
            // 過濾出當前範圍的任務
            const filteredTasks = {};
            Object.keys(preloadedTasks).forEach((date) => {
              const taskDate = new Date(date);
              if (taskDate >= startDate && taskDate <= endDate) {
                filteredTasks[date] = preloadedTasks[date];
              }
            });

            if (Object.keys(filteredTasks).length > 0) {
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
              console.log(
                `⚠️ [CalendarScreen] Preloaded tasks exist but none in range ${startDateStr} to ${endDateStr}, fetching from API`,
              );
            }
          } else {
            console.log(
              `⚠️ [CalendarScreen] Preloaded tasks exist but not in range ${startDateStr} to ${endDateStr}, fetching from API`,
            );
          }
        } else {
          console.log(
            `📥 [CalendarScreen] No cached data available, fetching from API for ${startDateStr} to ${endDateStr}`,
          );
        }

        console.log(`Fetching tasks from ${startDateStr} to ${endDateStr}`);

        const newTasks = await TaskService.getTasksByDateRange(
          startDateStr,
          endDateStr,
        );

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
        const taskDate = new Date(date);
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
    const todayDate = new Date(getToday());
    todayDate.setHours(12, 0, 0, 0);
    const currentMonth = new Date(getCurrentDate()).getMonth();
    const currentYear = new Date(getCurrentDate()).getFullYear();
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
    const todayDate = new Date(today);
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
          const taskDate = new Date(date);
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
  }, [centerToday, isInitialized]); // Include centerToday and isInitialized in dependencies

  // Reset to today when Calendar tab is focused (but avoid duplicate fetches)
  useFocusEffect(
    React.useCallback(() => {
      const today = getCurrentDate();
      const todayDate = new Date(today);
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

  // Sync state changes from TaskDetailScreen back to CalendarScreen
  useEffect(() => {
    if (route.params?.updatedTask) {
      const updated = route.params.updatedTask;
      setTasks((prev) => {
        const dayList = (prev[updated.date] || []).map((t) =>
          t.id === updated.id ? updated : t,
        );
        const newTasks = { ...prev, [updated.date]: dayList };
        widgetService.syncTodayTasks(newTasks);
        return newTasks;
      });
      navigation.setParams({ updatedTask: undefined });
    }
    if (route.params?.deletedTaskId) {
      const { deletedTaskId, deletedTaskDate } = route.params;
      setTasks((prev) => {
        const dayList = (prev[deletedTaskDate] || []).filter(
          (t) => t.id !== deletedTaskId,
        );
        const newTasks = { ...prev, [deletedTaskDate]: dayList };
        widgetService.syncTodayTasks(newTasks);
        return newTasks;
      });
      navigation.setParams({ deletedTaskId: undefined, deletedTaskDate: undefined });
    }
  }, [route.params?.updatedTask, route.params?.deletedTaskId]);

  // Note: We no longer need to save tasks to AsyncStorage
  // Tasks are automatically saved to Supabase when modified

  const openAddTask = (date) => {
    setEditingTask(null);
    setTaskText("");
    setTaskTime("");
    setTaskLink("");
    setTaskDate(date);
    setTaskNote("");
    setNoteInputHeight(100); // 重置為初始高度
    setLinkInputFocused(false);
    setSelectedDate(date);
    setModalVisible(true);
  };

  const openEditTask = (task) => {
    navigation.navigate("TaskDetail", {
      task,
      dayTasks: tasks[task.date] || [],
    });
  };

  // Helper function to clear task cache when tasks are modified
  const clearTaskCache = () => {
    fetchedRangesRef.current.clear();
    console.log("🗑️ [Cache] Cleared task cache");
  };

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
      } else {
        // Same date
        const dayTasks = tasks[targetDate] || [];
        const updatedDayTasks = dayTasks.map((t) =>
          t.id === editingTask.id ? updatedTask : t,
        );
        const newTasksState = { ...tasks, [targetDate]: updatedDayTasks };
        setTasks(newTasksState);
        widgetService.syncTodayTasks(newTasksState);
      }
    } else {
      // Create new task
      tempId = `temp-${Date.now()}`;
      const newTask = {
        id: tempId,
        ...taskData,
        is_completed: false,
        checked: false,
      };

      const dayTasks = tasks[targetDate] || [];
      const newTasksState = { ...tasks, [targetDate]: [...dayTasks, newTask] };
      setTasks(newTasksState);
      widgetService.syncTodayTasks(newTasksState);
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
    setNoteInputHeight(100); // 重置為初始高度
    setLinkInputFocused(false);

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

        // Cancel old notifications
        if (currentEditingTask.notificationIds) {
          await cancelTaskNotification(currentEditingTask.notificationIds);
        } else if (currentEditingTask.notificationId) {
          await cancelTaskNotification(currentEditingTask.notificationId);
        }

        // API Call
        const updatedTaskFromServer = await TaskService.updateTask(
          currentEditingTask.id,
          taskData,
        );

        // Schedule new notification
        if (Platform.OS !== "web") {
          const notificationIds = await scheduleTaskNotification(
            {
              id: updatedTaskFromServer.id,
              title: taskText,
              date: targetDate,
              time: taskTime,
              notificationIds: currentEditingTask.notificationIds,
            },
            t.taskReminder,
            getActiveReminderMinutes(),
            null,
            t,
          );

          // Update local state with new notification IDs (silent update)
          if (notificationIds.length > 0) {
            setTasks((currentTasks) => {
              const dayTasks = currentTasks[targetDate] || [];
              const updatedDayTasks = dayTasks.map((t) =>
                t.id === updatedTaskFromServer.id
                  ? { ...t, notificationIds }
                  : t,
              );
              return { ...currentTasks, [targetDate]: updatedDayTasks };
            });
          }
        }

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
        // API Call
        const createdTask = await TaskService.addTask({
          ...taskData,
          is_completed: false,
        });

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

          return updatedTasksState;
        });

        // Schedule notification for new task (native only)
        if (Platform.OS !== "web") {
          const notificationIds = await scheduleTaskNotification(
            {
              id: createdTask.id,
              title: taskText,
              date: targetDate,
              time: taskTime,
            },
            t.taskReminder,
            getActiveReminderMinutes(),
            null,
            t,
          );

          if (notificationIds.length > 0) {
            // Update local state with notification IDs
            setTasks((currentTasks) => {
              const dayTasks = currentTasks[targetDate] || [];
              const updatedDayTasks = dayTasks.map((t) =>
                t.id === createdTask.id ? { ...t, notificationIds } : t,
              );
              return { ...currentTasks, [targetDate]: updatedDayTasks };
            });
          }
        }

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
      Alert.alert("Error", "Failed to save task. Data has been restored.");
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

    // Close modal immediately
    setModalVisible(false);
    setEditingTask(null);
    setTaskText("");
    setTaskTime("");
    setTaskLink("");
    setTaskDate(selectedDate);
    setTaskNote("");
    setNoteInputHeight(100); // 重置為初始高度
    setLinkInputFocused(false);

    // Check if it's a temporary task
    if (String(editingTask.id).startsWith("temp-")) {
      console.log("Deleting temporary task locally:", editingTask.id);
      pendingTempActions.current[editingTask.id] = "delete";
      return; // Skip API call
    }

    try {
      // 2. Perform Background Operation
      // Cancel notification if exists
      if (editingTask.notificationIds) {
        await cancelTaskNotification(editingTask.notificationIds);
      } else if (editingTask.notificationId) {
        await cancelTaskNotification(editingTask.notificationId);
      }

      await TaskService.deleteTask(editingTask.id);

      // Clear cache after deletion
      clearTaskCache();
    } catch (error) {
      console.error("Error deleting task:", error);
      // 3. Rollback on Failure
      setTasks(previousTasks);
      widgetService.syncTodayTasks(previousTasks);
      Alert.alert("Error", "Failed to delete task. Data has been restored.");
    }
  };

  const startMoveTask = (task) => {
    setMoveMode(true);
    setTaskToMove(task);
    Alert.alert(t.moveTask, t.moveTaskAlert, [{ text: t.confirm }]);
  };

  const moveTaskToDate = async (task, toDate) => {
    if (task.date === toDate) return;
    if (task.date !== selectedDate) return;

    // Optimistic update: 立即更新 UI
    const fromTasks = tasks[selectedDate] ? [...tasks[selectedDate]] : [];
    const toTasks = tasks[toDate] ? [...tasks[toDate]] : [];
    const filteredTasks = fromTasks.filter((t) => t.id !== task.id);
    const updatedTask = { ...task, date: toDate };
    toTasks.push(updatedTask);
    const updatedTasks = {
      ...tasks,
      [selectedDate]: filteredTasks,
      [toDate]: toTasks,
    };

    // 保存舊狀態以便回滾
    const previousTasks = { ...tasks };

    // 立即更新 UI
    setTasks(updatedTasks);

    // 非阻塞 widget sync（不等待完成）
    widgetService.syncTodayTasks(updatedTasks).catch((error) => {
      console.error("Error syncing widget:", error);
    });

    setMoveMode(false);
    setTaskToMove(null);

    // 在背景更新數據庫（不阻塞 UI）
    try {
      await TaskService.updateTask(task.id, { date: toDate });
    } catch (error) {
      console.error("Error moving task:", error);
      // 回滾 UI 狀態
      setTasks(previousTasks);
      widgetService.syncTodayTasks(previousTasks).catch((err) => {
        console.error("Error syncing widget on rollback:", err);
      });
      Alert.alert("Error", "Failed to move task. Changes have been reverted.");
    }
  };

  // Format Date to YYYY-MM-DD in local time (avoid UTC shift in getMonthDates/getAdjacentDate/getWeekStart)
  const toLocalDateStr = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  // Helper to get all dates in a month
  const getMonthDates = (year, month) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const dates = [];
    // Add previous month's trailing days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      dates.push(
        toLocalDateStr(new Date(year, month - 1, prevMonthLastDay - i)),
      );
    }
    // Add current month's days
    for (let i = 1; i <= daysInMonth; i++) {
      dates.push(toLocalDateStr(new Date(year, month, i)));
    }
    // Add next month's leading days to fill 6 weeks
    const remainingDays = 42 - dates.length;
    for (let i = 1; i <= remainingDays; i++) {
      dates.push(toLocalDateStr(new Date(year, month + 1, i)));
    }
    return dates;
  };

  const renderCalendar = () => {
    const monthDates = getMonthDates(visibleYear, visibleMonth);
    const today = getCurrentDate();
    const currentMonth = new Date(visibleYear, visibleMonth, 1);

    // Group dates into weeks
    const weeks = [];
    for (let i = 0; i < monthDates.length; i += 7) {
      weeks.push(monthDates.slice(i, i + 7));
    }

    return (
      <View style={styles.monthContainer}>
        <View
          style={[styles.customCalendar, { backgroundColor: theme.background }]}
        >
          {/* Week day headers */}
          <View
            style={[
              styles.weekDaysHeader,
              { borderBottomColor: theme.divider },
            ]}
          >
            {t.weekDays.map((day, index) => (
              <Text
                key={index}
                style={[
                  styles.weekDayText,
                  {
                    color: theme.textSecondary,
                    fontFamily: theme.typography?.monoSection?.fontFamily || "JetBrainsMono_500Medium",
                  },
                ]}
              >
                {day}
              </Text>
            ))}
          </View>
          {/* Calendar grid */}
          {weeks.map((week, weekIndex) => (
            <View key={weekIndex} style={styles.calendarWeekRow}>
              {week.map((dateStr) => {
                const dateObj = new Date(dateStr);
                const isSelected = dateStr === selectedDate;
                const isToday = dateStr === today;
                const isCurrentMonth = dateObj.getMonth() === visibleMonth;
                const dayTasks = tasks[dateStr] || [];
                const taskCount = dayTasks.length; // Show dot for all tasks, including completed ones

                return (
                  <TouchableOpacity
                    key={dateStr}
                    onPress={() => {
                      if (moveMode && taskToMove) {
                        moveTaskToDate(taskToMove, dateStr);
                        setMoveMode(false);
                        setTaskToMove(null);
                      } else {
                        setSelectedDate(dateStr);
                      }
                    }}
                    style={[
                      styles.calendarDay,
                      isSelected && !isToday && {
                        borderWidth: 1.5,
                        borderColor: theme.primary,
                        backgroundColor: theme.background,
                      },
                      !isSelected && { backgroundColor: theme.background },
                      moveMode && styles.calendarDayMoveTarget,
                    ]}
                    activeOpacity={0.7}
                  >
                    <View style={styles.calendarDayContent}>
                      <View style={styles.dateContainer}>
                        {isToday && (
                          <View
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              alignItems: "center",
                              justifyContent: "center",
                              zIndex: 0,
                            }}
                          >
                            <View
                              style={[
                                styles.todayCircle,
                                { backgroundColor: theme.primary },
                              ]}
                            />
                          </View>
                        )}
                        <Text
                          style={[
                            styles.calendarDayText,
                            {
                              fontFamily: theme.typography?.monoDay?.fontFamily,
                            },
                            {
                              color: isCurrentMonth
                                ? theme.text
                                : theme.textTertiary,
                            },
                            isSelected && !isToday && [
                              styles.selectedDayText,
                              { color: theme.primary },
                            ],
                            isToday && { color: theme.buttonText || "#F2F1EB", fontWeight: "600", zIndex: 1 },
                          ]}
                        >
                          {dateObj.getDate()}
                        </Text>
                        {taskCount > 0 && (
                          <View
                            style={{
                              position: "absolute",
                              bottom: 3,
                              width: 4,
                              height: 4,
                              borderRadius: 2,
                              backgroundColor: isToday
                                ? theme.buttonText || "#F2F1EB"
                                : theme.primary,
                            }}
                          />
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderDate = (date) => {
    const isSelected = date === selectedDate;
    const dateObj = new Date(date);

    // Format the current date to match the date string format (YYYY-MM-DD)
    const today = new Date();
    const todayFormatted = `${today.getFullYear()}-${String(
      today.getMonth() + 1,
    ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const isToday = date === todayFormatted;

    const renderDateContent = () => {
      return (
        <View style={styles.dateContainer}>
          <View
            style={[
              styles.dayViewDateContainer,
              isToday && styles.todayCircleLarge,
              isSelected && styles.selectedDateLarge,
            ]}
          >
            <Text
              style={[
                styles.dayViewDayNumber,
                { color: theme.text },
                isSelected && [
                  styles.selectedDayText,
                  { color: theme.calendarTodayText },
                ],
                isToday && styles.todayTextLarge,
              ]}
            >
              {String(dateObj.getDate())}
            </Text>
          </View>
        </View>
      );
    };

    return (
      <TouchableOpacity
        key={date}
        onPress={() => {
          if (moveMode && taskToMove) {
            moveTaskToDate(taskToMove, date);
            setMoveMode(false);
            setTaskToMove(null);
          } else {
            setSelectedDate(date);
          }
        }}
        style={[
          styles.dayViewDayButton,
          { backgroundColor: "transparent" },
          isSelected && [
            styles.selectedDayLarge,
            { backgroundColor: theme.calendarSelected },
          ],
          moveMode && styles.calendarDayMoveTarget,
        ]}
        activeOpacity={0.7}
      >
        {renderDateContent()}
        {tasks[date] && tasks[date].length > 0 && (
          <View
            style={[styles.taskDotLarge, { backgroundColor: theme.primary }]}
          />
        )}
      </TouchableOpacity>
    );
  };

  const toggleTaskChecked = async (task) => {
    const newCompletedState = !(task.is_completed || task.checked);
    const previousTasks = { ...tasks }; // Backup for rollback

    // 1. Optimistic Update: Update UI immediately
    const dayTasks = tasks[task.date] ? [...tasks[task.date]] : [];
    const updatedTasksList = dayTasks.map((t) =>
      t.id === task.id
        ? {
            ...t,
            checked: newCompletedState,
            is_completed: newCompletedState,
          }
        : t,
    );
    const newTasksState = { ...tasks, [task.date]: updatedTasksList };

    setTasks(newTasksState);
    widgetService.syncTodayTasks(newTasksState);

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
    } catch (error) {
      console.error("Error toggling task:", error);
      // 3. Rollback on Failure
      setTasks(previousTasks);
      widgetService.syncTodayTasks(previousTasks);
      Alert.alert("Error", "Failed to update task. Please try again.");
    }
  };

  const renderTask = ({ item }) => {
    const done = !!(item.is_completed || item.checked);
    return (
      <View
        style={[
          styles.taskItemRow,
          {
            backgroundColor: theme.background,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: theme.rule || theme.divider,
            paddingVertical: 16,
            paddingHorizontal: 16,
          },
        ]}
      >
        <IOSCheckbox
          checked={done}
          onPress={() => toggleTaskChecked(item)}
          theme={theme}
        />
        <TouchableOpacity
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            marginLeft: 12,
            backgroundColor: "transparent",
          }}
          onPress={() => openEditTask(item)}
          onLongPress={() => startMoveTask(item)}
          activeOpacity={0.7}
        >
          <Text
            style={{
              flex: 1,
              fontFamily: theme.typography?.callout?.fontFamily,
              fontSize: 14,
              fontWeight: "500",
              letterSpacing: -0.2,
              color: done ? theme.textTertiary : theme.text,
              textDecorationLine: done ? "line-through" : "none",
            }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {item.title}
          </Text>
          {item.time ? (
            <Text
              style={{
                fontFamily:
                  theme.typography?.monoTime?.fontFamily ||
                  "JetBrainsMono_500Medium",
                fontSize: 13,
                fontWeight: "500",
                letterSpacing: -0.2,
                color: done ? theme.textTertiary : theme.primary,
                marginLeft: 8,
                flexShrink: 0,
              }}
            >
              {formatTimeDisplay(item.time)}
            </Text>
          ) : null}
          {moveMode && taskToMove && taskToMove.id === item.id ? (
            <Text style={[styles.moveHint, { color: theme.primary }]}>
              {t.moveHint}
            </Text>
          ) : null}
        </TouchableOpacity>
      </View>
    );
  };

  // Helper to get previous/next day in YYYY-MM-DD (local time)
  const getAdjacentDate = (dateStr, diff) => {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + diff);
    return toLocalDateStr(date);
  };

  // Helper to get week start date (Sunday) in local YYYY-MM-DD
  const getWeekStart = (dateStr) => {
    const date = new Date(dateStr);
    const day = date.getDay();
    date.setDate(date.getDate() - day);
    return toLocalDateStr(date);
  };

  // Handler for horizontal swipe in task area
  const handleTaskAreaGesture = ({ nativeEvent }) => {
    const { translationX, translationY, state } = nativeEvent;
    // Only trigger on gesture end (state === 5 for END) and minimal vertical movement
    if (state === 5 && Math.abs(translationY) < 20) {
      if (translationX < -1) {
        // Swipe left, go to next day
        setSelectedDate(getAdjacentDate(selectedDate, 1));
      } else if (translationX > 1) {
        // Swipe right, go to previous day
        setSelectedDate(getAdjacentDate(selectedDate, -1));
      }
    }
  };

  const renderTaskArea = () => {
    const dayTasks = tasks[selectedDate] || [];
    // 如果正在載入且還沒有任何任務數據，顯示 skeleton
    const shouldShowSkeleton =
      isLoadingTasks && Object.keys(tasks).length === 0;

    const [selY, selM, selD] = selectedDate.split("-").map(Number);
    const selDateObj = new Date(selY, selM - 1, selD);
    const weekDayAbbr = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][
      selDateObj.getDay()
    ];
    const isSelectedToday = selectedDate === getToday();
    const selMonthName = t.months ? t.months[selM - 1] : String(selM);
    const bannerDateLabel = isSelectedToday
      ? t.today || "Today"
      : `${selMonthName} ${selD}`;
    const completedCount = dayTasks.filter(
      (t) => t.is_completed || t.checked,
    ).length;
    const totalCount = dayTasks.length;

    const taskAreaContent = (
      <View
        style={[
          styles.taskArea,
          { flex: 1, backgroundColor: theme.background },
        ]}
      >
        <View
          style={[
            styles.taskAreaContent,
            { flex: 1, backgroundColor: theme.background },
          ]}
        >
          {/* Accent date banner */}
          <View
            style={{
              backgroundColor: theme.primary,
              paddingHorizontal: 16,
              paddingVertical: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View>
              <Text
                style={{
                  fontFamily:
                    theme.typography?.monoKicker?.fontFamily ||
                    "JetBrainsMono_500Medium",
                  fontSize: 10,
                  fontWeight: "500",
                  letterSpacing: 1.5,
                  color: (theme.buttonText || "#F2F1EB") + "99",
                  marginBottom: 2,
                }}
              >
                {isSelectedToday
                  ? `${String(selM).padStart(2, "0")}.${String(selD).padStart(2, "0")}.${String(selY).slice(-2)}`
                  : weekDayAbbr}
              </Text>
              <Text
                style={{
                  fontFamily: theme.typography?.title3?.fontFamily,
                  fontSize: 18,
                  fontWeight: "600",
                  letterSpacing: -0.4,
                  color: theme.buttonText || "#F2F1EB",
                }}
              >
                {bannerDateLabel}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text
                style={{
                  fontFamily:
                    theme.typography?.monoKicker?.fontFamily ||
                    "JetBrainsMono_500Medium",
                  fontSize: 9,
                  letterSpacing: 1.2,
                  color: (theme.buttonText || "#F2F1EB") + "BF",
                  marginBottom: 2,
                }}
              >
                {t.done || "Done"}
              </Text>
              <Text
                style={{
                  fontFamily:
                    theme.typography?.monoTime?.fontFamily ||
                    "JetBrainsMono_500Medium",
                  fontSize: 15,
                  fontWeight: "500",
                  color: theme.buttonText || "#F2F1EB",
                }}
              >
                {totalCount > 0 ? `${completedCount} / ${totalCount}` : "—"}
              </Text>
            </View>
          </View>

          {/* Floating Add Button */}
          <IndigoFAB
            onPress={() => openAddTask(selectedDate)}
            theme={theme}
            isNative={isIOS26Plus}
          />

          {shouldShowSkeleton ? (
            <View style={{ flex: 1, backgroundColor: theme.background }}>
              <FlatList
                data={[1, 2, 3, 4]} // 顯示 4 個 skeleton
                keyExtractor={(item) => `skeleton-${item}`}
                renderItem={({ index }) => <TaskSkeleton theme={theme} widthIndex={index} />}
                contentContainerStyle={styles.tasksScrollContent}
                showsVerticalScrollIndicator={false}
                style={{ backgroundColor: theme.background }}
              />
            </View>
          ) : dayTasks.length === 0 ? (
            <View style={styles.noTaskContainer}>
              <Svg
                width={64}
                height={64}
                viewBox="0 0 64 64"
                style={{ marginBottom: 12 }}
              >
                <Rect x="10" y="20" width="44" height="32" rx="8" fill="#eee" />
                <Line
                  x1="18"
                  y1="32"
                  x2="46"
                  y2="32"
                  stroke="#bbb"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <Line
                  x1="18"
                  y1="40"
                  x2="38"
                  y2="40"
                  stroke="#ccc"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <Circle cx="32" cy="16" r="6" fill="#e0e0e0" />
              </Svg>
              <Text style={[styles.noTaskText, { color: theme.textSecondary }]}>
                {t.noTasks}
              </Text>
            </View>
          ) : (
            <View style={{ flex: 1, backgroundColor: theme.background }}>
              <FlatList
                data={dayTasks.slice().sort((a, b) => {
                  // 已完成的任務排到最底下
                  const aCompleted = a.is_completed || a.checked;
                  const bCompleted = b.is_completed || b.checked;
                  if (aCompleted !== bCompleted) {
                    return aCompleted ? 1 : -1;
                  }
                  // 未完成的任務按時間排序
                  return (a.time || "").localeCompare(b.time || "");
                })}
                keyExtractor={(item) => item.id}
                renderItem={renderTask}
                contentContainerStyle={styles.tasksScrollContent}
                showsVerticalScrollIndicator={false}
                style={{ backgroundColor: theme.background }}
              />
            </View>
          )}
        </View>
      </View>
    );

    // On web, return content directly without PanGestureHandler to avoid scroll issues
    if (Platform.OS === "web") {
      return taskAreaContent;
    }

    // On native, wrap with PanGestureHandler for swipe gestures
    return (
      <PanGestureHandler
        onHandlerStateChange={handleTaskAreaGesture}
        activeOffsetY={[-1000, 1000]}
        activeOffsetX={[-50, 50]}
      >
        {taskAreaContent}
      </PanGestureHandler>
    );
  };

  const renderModal = () => {
    const isZH = language === "zh-Hant";
    const monoKickerStyle = {
      fontFamily: theme.typography?.monoKicker?.fontFamily || "JetBrainsMono_500Medium",
      fontSize: 9,
      fontWeight: "500",
      letterSpacing: 1.5,
      textTransform: "uppercase",
    };

    const formatDateDisplay = (dateStr) => {
      if (!dateStr) return null;
      const [y, m, d] = dateStr.split("-").map(Number);
      const dow = new Date(y, m - 1, d).getDay();
      const dowNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
      const monNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      if (isZH) return `${y} 年 ${m} 月 ${d} 日`;
      return `${dowNames[dow]}, ${monNames[m-1]} ${d}`;
    };

    const FieldRow = ({ iconName, labelText, value, isPlaceholder, onPress, webInput }) => (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={styles.modalFieldRow}
      >
        <MaterialIcons name={iconName} size={18} color={theme.textSecondary} />
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={[monoKickerStyle, { color: theme.textTertiary, marginBottom: 1 }]}>
            {labelText}
          </Text>
          {Platform.OS === "web" && webInput ? webInput : (
            <Text
              style={{
                fontFamily: theme.typography?.body?.fontFamily,
                fontSize: 15,
                fontWeight: "500",
                color: isPlaceholder ? theme.textTertiary : theme.text,
                letterSpacing: -0.2,
              }}
            >
              {value}
            </Text>
          )}
        </View>
        <MaterialIcons name="chevron-right" size={16} color={theme.textTertiary} />
      </TouchableOpacity>
    );

    const FieldDivider = () => (
      <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.rule, marginLeft: 16 + 18 + 14 }} />
    );

    return (
      <Modal
        animationType="slide"
        transparent={false}
        presentationStyle={Platform.OS === "ios" ? "pageSheet" : undefined}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
        accessibilityViewIsModal={true}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.background }]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
            keyboardVerticalOffset={0}
          >
            <View style={[styles.modalContent, { backgroundColor: theme.backgroundSecondary || theme.background }]}>
              {/* Grabber */}
              {Platform.OS === "ios" && (
                <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 4 }}>
                  <View style={{
                    width: 36, height: 4, borderRadius: 2,
                    backgroundColor: theme.mode === "dark" ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.18)",
                  }} />
                </View>
              )}

              {/* Nav bar */}
              <View style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{ minWidth: 60 }}
                >
                  <Text style={{
                    fontFamily: theme.typography?.footnote?.fontFamily,
                    fontSize: 14,
                    fontWeight: "500",
                    color: theme.textSecondary,
                    letterSpacing: -0.2,
                  }}>
                    {isZH ? "取消" : "Cancel"}
                  </Text>
                </TouchableOpacity>
                <Text style={{
                  fontFamily: theme.typography?.headline?.fontFamily,
                  fontSize: 14,
                  fontWeight: "600",
                  color: theme.text,
                  letterSpacing: -0.2,
                }}>
                  {editingTask ? (isZH ? "編輯任務" : "Edit task") : (isZH ? "新增任務" : "New task")}
                </Text>
                <TouchableOpacity
                  onPress={saveTask}
                  disabled={!taskText.trim()}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{ minWidth: 60, alignItems: "flex-end" }}
                >
                  <Text style={{
                    fontFamily: theme.typography?.headline?.fontFamily,
                    fontSize: 14,
                    fontWeight: "600",
                    color: taskText.trim() ? theme.primary : theme.textTertiary,
                    letterSpacing: -0.2,
                  }}>
                    {isZH ? "儲存" : "Save"}
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                ref={modalScrollViewRef}
                style={styles.modalScrollView}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 60 }}
                nestedScrollEnabled={true}
              >
                {/* Title area */}
                <View style={{
                  backgroundColor: theme.background,
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: theme.rule,
                  borderBottomWidth: 1.5,
                  borderBottomColor: theme.ruleStrong || "rgba(26,31,46,0.22)",
                  paddingHorizontal: 22,
                  paddingTop: 18,
                  paddingBottom: 22,
                }}>
                  <Text style={[monoKickerStyle, {
                    fontSize: 10,
                    letterSpacing: 2,
                    color: theme.primary,
                    marginBottom: 8,
                  }]}>
                    {isZH ? "任務標題" : "What needs doing?"}
                  </Text>
                  <TextInput
                    ref={taskTitleInputRef}
                    style={{
                      fontFamily: theme.typography?.title2?.fontFamily || "InterTight_600SemiBold",
                      fontSize: 24,
                      fontWeight: "600",
                      color: theme.text,
                      letterSpacing: -0.6,
                      lineHeight: 30,
                      minHeight: 36,
                      padding: 0,
                    }}
                    value={taskText}
                    onChangeText={setTaskText}
                    placeholder={isZH ? "輸入任務..." : "e.g. Lunch with Mei"}
                    placeholderTextColor={theme.textTertiary}
                    autoFocus={false}
                    multiline
                    returnKeyType="done"
                    blurOnSubmit
                    onSubmitEditing={() => { if (taskText.trim()) saveTask(); }}
                  />
                </View>

                {/* Field rows */}
                <View style={{
                  backgroundColor: theme.background,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: theme.rule,
                  marginTop: 1,
                }}>
                  {/* Date */}
                  {Platform.OS === "web" ? (
                    <View style={styles.modalFieldRow}>
                      <MaterialIcons name="event" size={18} color={theme.textSecondary} />
                      <View style={{ flex: 1, marginLeft: 14 }}>
                        <Text style={[monoKickerStyle, { color: theme.textTertiary, marginBottom: 1 }]}>
                          {isZH ? "日期" : "DATE"}
                        </Text>
                        <input
                          type="date"
                          value={taskDate}
                          onChange={(e) => setTaskDate(e.target.value)}
                          style={{
                            fontSize: 15, border: "none", backgroundColor: "transparent",
                            fontFamily: "inherit", outline: "none", color: theme.text,
                            padding: 0, width: "100%",
                          }}
                        />
                      </View>
                    </View>
                  ) : (
                    <FieldRow
                      iconName="event"
                      labelText={isZH ? "日期" : "DATE"}
                      value={formatDateDisplay(taskDate) || (isZH ? "選擇日期" : "Pick a date")}
                      isPlaceholder={!taskDate}
                      onPress={() => {
                        Keyboard.dismiss();
                        setTempDate(taskDate ? new Date(taskDate) : new Date());
                        setDatePickerVisible(true);
                      }}
                    />
                  )}

                  <FieldDivider />

                  {/* Time */}
                  {Platform.OS === "web" ? (
                    <View style={styles.modalFieldRow}>
                      <MaterialIcons name="access-time" size={18} color={theme.textSecondary} />
                      <View style={{ flex: 1, marginLeft: 14 }}>
                        <Text style={[monoKickerStyle, { color: theme.textTertiary, marginBottom: 1 }]}>
                          {isZH ? "時間" : "TIME"}
                        </Text>
                        <input
                          type="time"
                          step="60"
                          value={taskTime}
                          onChange={(e) => setTaskTime(e.target.value)}
                          style={{
                            fontSize: 15, border: "none", backgroundColor: "transparent",
                            fontFamily: "inherit", outline: "none", color: theme.text,
                            padding: 0, width: "100%",
                          }}
                        />
                      </View>
                    </View>
                  ) : (
                    <FieldRow
                      iconName="access-time"
                      labelText={isZH ? "時間" : "TIME"}
                      value={taskTime || (isZH ? "無" : "None")}
                      isPlaceholder={!taskTime}
                      onPress={() => {
                        Keyboard.dismiss();
                        const now = new Date();
                        setTempTime(
                          taskTime
                            ? new Date(2024, 0, 1, parseInt(taskTime.split(":")[0]) || 0, parseInt(taskTime.split(":")[1]) || 0)
                            : now,
                        );
                        setTimePickerVisible(true);
                      }}
                    />
                  )}

                  <FieldDivider />

                  {/* Repeat (static) */}
                  <FieldRow
                    iconName="repeat"
                    labelText={isZH ? "重複" : "REPEAT"}
                    value={isZH ? "不重複" : "Does not repeat"}
                    onPress={() => {}}
                  />

                  <FieldDivider />

                  {/* Link */}
                  <View style={[styles.modalFieldRow, { alignItems: "flex-start", paddingTop: 14 }]}>
                    <MaterialIcons name="link" size={18} color={theme.textSecondary} style={{ marginTop: 2 }} />
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text style={[monoKickerStyle, { color: theme.textTertiary, marginBottom: 6 }]}>
                        LINK
                      </Text>
                      <TextInput
                        style={{
                          fontFamily: theme.typography?.body?.fontFamily,
                          fontSize: 15,
                          fontWeight: "500",
                          color: taskLink ? theme.text : theme.textTertiary,
                          letterSpacing: -0.2,
                          padding: 0,
                        }}
                        value={taskLink}
                        onChangeText={setTaskLink}
                        placeholder={isZH ? "貼上連結…" : "Paste a link…"}
                        placeholderTextColor={theme.textTertiary}
                        keyboardType="url"
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      {taskLink ? (
                        <MapPreview
                          url={taskLink}
                          theme={theme}
                          t={t}
                          onOpenInBrowser={() => {
                            const url = taskLink.startsWith("http") ? taskLink : `https://${taskLink}`;
                            Linking.openURL(url).catch(console.error);
                          }}
                        />
                      ) : null}
                    </View>
                  </View>
                </View>

                {/* Notes section */}
                <View style={{
                  backgroundColor: theme.background,
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: theme.rule,
                  paddingHorizontal: 22,
                  paddingTop: 16,
                  paddingBottom: 20,
                  marginTop: 8,
                  flex: 1,
                  minHeight: 120,
                }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <MaterialIcons name="notes" size={16} color={theme.textSecondary} />
                    <Text style={[monoKickerStyle, { color: theme.textSecondary }]}>
                      {isZH ? "備註（選填）" : "Notes (optional)"}
                    </Text>
                  </View>
                  <TextInput
                    style={{
                      fontFamily: theme.typography?.body?.fontFamily,
                      fontSize: 14,
                      fontWeight: "400",
                      color: theme.text,
                      letterSpacing: -0.1,
                      lineHeight: 22,
                      padding: 0,
                      minHeight: 80,
                      textAlignVertical: "top",
                    }}
                    value={taskNote}
                    onChangeText={setTaskNote}
                    placeholder={isZH ? "新增說明、連結、任何你之後會用到的內容…" : "Add context, links, or anything you'll want to see later…"}
                    placeholderTextColor={theme.textTertiary}
                    multiline
                    textAlignVertical="top"
                  />
                </View>

                {/* Delete button (edit mode only) */}
                {editingTask && (
                  <TouchableOpacity
                    onPress={showDeleteConfirm}
                    style={{
                      marginHorizontal: 20,
                      marginTop: 8,
                      marginBottom: 8,
                      paddingVertical: 14,
                      alignItems: "center",
                      borderWidth: StyleSheet.hairlineWidth,
                      borderColor: theme.error,
                      borderRadius: theme.radius?.lg || 8,
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={{
                      fontFamily: theme.typography?.headline?.fontFamily,
                      fontSize: 13,
                      fontWeight: "600",
                      color: theme.error,
                      letterSpacing: isZH ? 0 : 0.4,
                      textTransform: isZH ? "none" : "uppercase",
                    }}>
                      {isZH ? "刪除任務" : "Delete task"}
                    </Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
          {renderDatePickerOverlay()}
          {renderTimePickerOverlay()}
        </View>
      </Modal>
    );
  };

  const renderDeleteConfirmModal = () => {
    console.log(
      "renderDeleteConfirmModal called, deleteConfirmVisible:",
      deleteConfirmVisible,
    );

    if (!deleteConfirmVisible) return null;

    return (
      <Modal
        visible={deleteConfirmVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setDeleteConfirmVisible(false)}
        accessibilityViewIsModal={true}
        accessibilityLabel="Delete Confirmation Modal"
        statusBarTranslucent={true}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: theme.modalOverlay,
            justifyContent: "center",
            alignItems: "center",
          }}
          activeOpacity={1}
          onPress={() => setDeleteConfirmVisible(false)}
        >
          <View
            style={{
              backgroundColor: theme.modalBackground,
              borderRadius: 12,
              minWidth: 280,
              maxWidth: 320,
              alignItems: "center",
              overflow: "hidden",
            }}
          >
            <View style={{ padding: 24, paddingBottom: 16 }}>
              <Text
                style={{
                  fontSize: 18,
                  color: theme.text,
                  textAlign: "center",
                  fontWeight: "600",
                  lineHeight: 24,
                }}
              >
                {t.deleteConfirm}
              </Text>
            </View>

            <View
              style={{
                height: 1,
                backgroundColor: theme.divider,
                width: "100%",
              }}
            />

            <View
              style={{
                flexDirection: "row",
                width: "100%",
                padding: 16,
                gap: 12,
              }}
            >
              <IOSButton
                title={t.cancel}
                onPress={() => setDeleteConfirmVisible(false)}
                theme={theme}
                variant="secondary"
                style={{ flex: 1 }}
              />
              <IOSButton
                title={t.delete}
                onPress={deleteTask}
                theme={theme}
                variant="destructive"
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  const renderDatePickerOverlay = () => {
    if (!datePickerVisible || Platform.OS === "web") return null;

    return (
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1000,
        }}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: theme.modalOverlay || "rgba(26,31,46,0.55)",
            justifyContent: "flex-end",
          }}
          activeOpacity={1}
          onPress={() => setDatePickerVisible(false)}
        >
          <View
            style={{
              backgroundColor: theme.backgroundSecondary,
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
              paddingBottom: insets.bottom,
            }}
            onStartShouldSetResponder={() => true}
          >
            {/* Grabber */}
            <View style={{ alignItems: "center", paddingTop: 10, paddingBottom: 2 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.textTertiary, opacity: 0.5 }} />
            </View>
            {/* Cancel / Title / Done */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingHorizontal: 16,
                paddingVertical: 10,
              }}
            >
              <TouchableOpacity
                onPress={() => setDatePickerVisible(false)}
                style={{ padding: 6, minWidth: 60 }}
              >
                <Text style={{
                  fontFamily: theme.typography?.callout?.fontFamily,
                  fontSize: 14,
                  fontWeight: "500",
                  letterSpacing: -0.2,
                  color: theme.textSecondary,
                }}>
                  {t.cancel}
                </Text>
              </TouchableOpacity>
              <Text style={{
                fontFamily: theme.typography?.callout?.fontFamily,
                fontSize: 14,
                fontWeight: "600",
                letterSpacing: -0.2,
                color: theme.text,
              }}>
                {isZH ? "日期" : "Date"}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  if (tempDate) {
                    const year = tempDate.getFullYear();
                    const month = String(tempDate.getMonth() + 1).padStart(2, "0");
                    const day = String(tempDate.getDate()).padStart(2, "0");
                    setTaskDate(`${year}-${month}-${day}`);
                  }
                  setDatePickerVisible(false);
                }}
                style={{ padding: 6, minWidth: 60, alignItems: "flex-end" }}
              >
                <Text style={{
                  fontFamily: theme.typography?.callout?.fontFamily,
                  fontSize: 14,
                  fontWeight: "600",
                  letterSpacing: -0.2,
                  color: theme.primary,
                }}>
                  {t.confirm || (isZH ? "完成" : "Done")}
                </Text>
              </TouchableOpacity>
            </View>
            {tempDate && (
              <View style={{ alignItems: "center", width: "100%", backgroundColor: theme.background, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.divider }}>
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display={Platform.OS === "ios" ? "inline" : "calendar"}
                  themeVariant={themeMode === "dark" ? "dark" : "light"}
                  accentColor={theme.primary}
                  onChange={(event, selectedDate) => {
                    if (selectedDate) {
                      setTempDate(selectedDate);
                    }
                  }}
                  style={{ width: "100%" }}
                />
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderTimePickerOverlay = () => {
    if (!timePickerVisible || Platform.OS === "web") return null;

    const displayH = tempTime ? String(tempTime.getHours()).padStart(2, "0") : "00";
    const displayM = tempTime ? String(tempTime.getMinutes()).padStart(2, "0") : "00";

    const adjustTime = (deltaMinutes) => {
      const base = tempTime ? new Date(tempTime.getTime()) : new Date();
      base.setMinutes(base.getMinutes() + deltaMinutes);
      setTempTime(base);
    };

    const monoFont = theme.typography?.monoTime?.fontFamily || "JetBrainsMono_500Medium";

    return (
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1000,
        }}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: theme.modalOverlay || "rgba(26,31,46,0.55)",
            justifyContent: "flex-end",
          }}
          activeOpacity={1}
          onPress={() => setTimePickerVisible(false)}
        >
          <View
            style={{
              backgroundColor: theme.backgroundSecondary,
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
              paddingBottom: insets.bottom,
            }}
            onStartShouldSetResponder={() => true}
          >
            {/* Grabber */}
            <View style={{ alignItems: "center", paddingTop: 10, paddingBottom: 2 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.textTertiary, opacity: 0.5 }} />
            </View>
            {/* Cancel / Title / Done */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingHorizontal: 16,
                paddingVertical: 10,
              }}
            >
              <TouchableOpacity
                onPress={() => setTimePickerVisible(false)}
                style={{ padding: 6, minWidth: 60 }}
              >
                <Text style={{
                  fontFamily: theme.typography?.callout?.fontFamily,
                  fontSize: 14,
                  fontWeight: "500",
                  letterSpacing: -0.2,
                  color: theme.textSecondary,
                }}>
                  {t.cancel}
                </Text>
              </TouchableOpacity>
              <Text style={{
                fontFamily: theme.typography?.callout?.fontFamily,
                fontSize: 14,
                fontWeight: "600",
                letterSpacing: -0.2,
                color: theme.text,
              }}>
                {isZH ? "時間" : "Time"}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  if (tempTime) {
                    const hours = String(tempTime.getHours()).padStart(2, "0");
                    const minutes = String(tempTime.getMinutes()).padStart(2, "0");
                    setTaskTime(`${hours}:${minutes}`);
                  }
                  setTimePickerVisible(false);
                }}
                style={{ padding: 6, minWidth: 60, alignItems: "flex-end" }}
              >
                <Text style={{
                  fontFamily: theme.typography?.callout?.fontFamily,
                  fontSize: 14,
                  fontWeight: "600",
                  letterSpacing: -0.2,
                  color: theme.primary,
                }}>
                  {t.confirm || (isZH ? "完成" : "Done")}
                </Text>
              </TouchableOpacity>
            </View>
            {/* Big mono time display */}
            <View
              style={{
                paddingVertical: 40,
                paddingHorizontal: 22,
                backgroundColor: theme.background,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: theme.divider,
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: theme.divider,
                alignItems: "center",
              }}
            >
              <Text style={{
                fontFamily: monoFont,
                fontSize: 11,
                fontWeight: "500",
                letterSpacing: 2,
                textTransform: "uppercase",
                color: theme.primary,
                marginBottom: 10,
              }}>
                {isZH ? "開始時間" : "Starts at"}
              </Text>
              <Text style={{
                fontFamily: monoFont,
                fontSize: 80,
                fontWeight: "500",
                lineHeight: 80,
                letterSpacing: -3,
                color: theme.text,
              }}>
                {displayH}
                <Text style={{ color: theme.textTertiary }}>:</Text>
                {displayM}
              </Text>
            </View>
            {/* Stepper buttons */}
            <View
              style={{
                flexDirection: "row",
                gap: 8,
                padding: 22,
                backgroundColor: theme.background,
              }}
            >
              {[
                { label: "− 1h", delta: -60 },
                { label: "− 15m", delta: -15 },
                { label: "+ 15m", delta: 15 },
                { label: "+ 1h", delta: 60 },
              ].map(({ label, delta }) => (
                <TouchableOpacity
                  key={label}
                  onPress={() => adjustTime(delta)}
                  activeOpacity={0.6}
                  style={{
                    flex: 1,
                    paddingVertical: 13,
                    backgroundColor: "transparent",
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: theme.ruleStrong || theme.divider,
                    borderRadius: 8,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{
                    fontFamily: theme.typography?.callout?.fontFamily,
                    fontSize: 13,
                    fontWeight: "500",
                    letterSpacing: -0.2,
                    color: theme.text,
                  }}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  // Handle scroll start to detect swipe direction
  const handleScrollBeginDrag = (event) => {
    scrollStartY.current = event.nativeEvent.contentOffset.y;
    isScrolling.current = true;
  };

  // Handle scroll end to detect month changes via swipe
  const handleScrollEnd = (event) => {
    if (!isScrolling.current) {
      return;
    }

    const scrollY = event.nativeEvent.contentOffset.y;
    const scrollDelta = scrollStartY.current - scrollY;
    const weekHeight = 50;
    const swipeThreshold = 30; // Minimum scroll distance to change month (30px)

    // Check if user swiped significantly (not just scrolled within calendar)
    // 方向已交換：向下滾動（scrollDelta > 0）→ 上一個月，向上滾動（scrollDelta < 0）→ 下一個月
    if (Math.abs(scrollDelta) > swipeThreshold) {
      if (scrollDelta > 0) {
        // Scrolled down (content moved up) - user wants to see previous month
        goToPrevMonth();
      } else {
        // Scrolled up (content moved down) - user wants to see next month
        goToNextMonth();
      }
    }

    isScrolling.current = false;
    lastScrollY.current = scrollY;
  };

  // Calendar navigation functions
  // Handles vertical swipe gestures for month navigation (fallback for gesture handler)
  const handleVerticalGesture = ({ nativeEvent }) => {
    const { translationY, state } = nativeEvent;
    // State.END = 5 in react-native-gesture-handler
    // Only trigger on gesture end
    if (state === State.END || state === 5) {
      if (translationY < -50) {
        console.log("Gesture: Swipe up detected, going to next month");
        goToNextMonth(); // Swipe up
      } else if (translationY > 50) {
        console.log("Gesture: Swipe down detected, going to previous month");
        goToPrevMonth(); // Swipe down
      }
    }
  };

  // Calendar header UI - Month view
  const monthNames = t.months;
  const monthName = monthNames[visibleMonth];
  const year = visibleYear;

  const goToPrevMonth = () => {
    const newMonth = visibleMonth === 0 ? 11 : visibleMonth - 1;
    const newYear = visibleMonth === 0 ? visibleYear - 1 : visibleYear;
    setVisibleMonth(newMonth);
    setVisibleYear(newYear);
    // Don't change selectedDate when navigating months
    // User is just browsing different months, not selecting a new date
  };

  const goToNextMonth = () => {
    const newMonth = visibleMonth === 11 ? 0 : visibleMonth + 1;
    const newYear = visibleMonth === 11 ? visibleYear + 1 : visibleYear;
    setVisibleMonth(newMonth);
    setVisibleYear(newYear);
    // Don't change selectedDate when navigating months
    // User is just browsing different months, not selecting a new date
  };

  const EN_MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const secondaryMonthName = language !== "en" ? EN_MONTHS[visibleMonth] : null;

  const header = (
    <View
      style={[
        styles.fixedHeader,
        {
          borderBottomWidth: StyleSheet.hairlineWidth * 2,
          borderBottomColor: theme.ruleStrong || "rgba(26,31,46,0.22)",
        },
      ]}
    >
      <View
        style={[styles.headerContainer, { paddingTop: 12, paddingBottom: 12 }]}
      >
        <View style={styles.headerLeftContainer}>
          <View>
            <Text
              style={{
                fontFamily:
                  theme.typography?.monoKicker?.fontFamily ||
                  "JetBrainsMono_500Medium",
                fontSize: 10,
                fontWeight: "500",
                letterSpacing: 2,
                textTransform: "uppercase",
                color: theme.primary,
                marginBottom: 4,
              }}
            >
              {year}
            </Text>
            <View
              style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}
            >
              <Text
                style={{
                  fontFamily:
                    theme.typography?.largeTitle?.fontFamily ||
                    "InterTight_600SemiBold",
                  fontSize: 34,
                  fontWeight: "600",
                  letterSpacing: -1.3,
                  lineHeight: 36,
                  color: theme.text,
                }}
              >
                {monthName}
              </Text>
              {secondaryMonthName ? (
                <Text
                  style={{
                    fontFamily: theme.typography?.callout?.fontFamily || "InterTight_500Medium",
                    fontSize: 14,
                    fontWeight: "500",
                    letterSpacing: -0.15,
                    color: theme.textTertiary,
                  }}
                >
                  {secondaryMonthName}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
        <View
          style={[
            styles.headerRightContainer,
            { alignSelf: "flex-end", gap: 10 },
          ]}
        >
          <View style={{ flexDirection: "row", gap: 4 }}>
            <TouchableOpacity
              onPress={goToPrevMonth}
              style={[
                styles.dayNavButton,
                {
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: theme.ruleStrong || "rgba(26,31,46,0.22)",
                },
              ]}
              activeOpacity={0.7}
            >
              <MaterialIcons name="chevron-left" size={16} color={theme.text} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={goToNextMonth}
              style={[
                styles.dayNavButton,
                {
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: theme.ruleStrong || "rgba(26,31,46,0.22)",
                },
              ]}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="chevron-right"
                size={16}
                color={theme.text}
              />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[
              styles.todayButton,
              {
                backgroundColor: theme.primaryTint || "#E6E9F2",
                marginLeft: 4,
              },
            ]}
            onPress={() => {
              const today = getCurrentDate();
              setSelectedDate(today);
              setVisibleMonth(new Date(today).getMonth());
              setVisibleYear(new Date(today).getFullYear());
            }}
          >
            <Text style={[styles.todayButtonText, { color: theme.primary }]}>
              {t.today}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const calendarContent = (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View
        style={[styles.calendarSection, { backgroundColor: theme.background }]}
      >
        {header}
        <View style={styles.calendarScrollView}>
          <ScrollView
            ref={scrollViewRef}
            onScrollBeginDrag={handleScrollBeginDrag}
            onScrollEndDrag={handleScrollEnd}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {renderCalendar()}
            <View style={styles.scrollSpacer} />
          </ScrollView>
        </View>
      </View>
      <View
        style={[
          styles.taskAreaContainer,
          {
            backgroundColor: theme.background,
            paddingBottom: !loadingUserType && userType === "general" ? 58 : 0,
          },
        ]}
      >
        {renderTaskArea()}
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
      {renderModal()}
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

const styles = StyleSheet.create({
  taskItemRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  checkbox: {
    marginRight: 8,
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  taskTextChecked: {
    textDecorationLine: "line-through",
    color: "#8E94AA",
  },
  fabAddButton: {
    position: "absolute",
    right: 20,
    bottom: 8,
    zIndex: 10,
    borderRadius: 32,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    width: 64,
    height: 64,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 7,
  },
  // ...
  // Removed bottomMenuBar style, handled by Tab.Navigator now

  container: {
    flex: 1,
    flexDirection: "column",
    // backgroundColor moved to inline style to use theme
  },
  calendarSection: {
    flexShrink: 0,
    paddingVertical: 4, // Reduced from 8 to give more space to task area
    // backgroundColor moved to inline style to use theme
  },
  taskAreaContainer: {
    // backgroundColor moved to inline style to use theme
    width: "100%",
    flex: 1,
  },
  taskArea: {
    flex: 1,
    // backgroundColor moved to inline style to use theme
  },
  fixedHeader: {
    backgroundColor: "transparent",
    zIndex: 10,
  },
  currentMonthTitle: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "left",
  },
  weekDaysHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16, // 8 (original) + 8 (to compensate for marginHorizontal)
    paddingBottom: 4, // Reduced from 8
    marginHorizontal: -12, // Extend border line to edges (matches customCalendar marginHorizontal)
    borderBottomWidth: 1,
  },
  // Scroll container
  calendarDivider: {
    height: 1,
    backgroundColor: "#bbbbbb",
    marginBottom: 4,
  },
  calendarScrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingBottom: 0,
  },
  scrollSpacer: {
    height: 4, // Reduced from 10 to minimize space
  },
  // Month container
  monthContainer: {
    marginBottom: 0,
  },
  customCalendar: {
    padding: 4,
    paddingBottom: 6,
    marginHorizontal: 8,
  },
  weekDayText: {
    flex: 1,
    textAlign: "center",
    fontSize: 9,
    fontWeight: "500",
    letterSpacing: 1.5,
    minWidth: 40,
    maxWidth: 40,
  },
  calendarWeekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 44, // Reduced from 50 to make calendar more compact
    paddingHorizontal: 4,
  },
  emptyDate: {
    width: 40,
    height: 40,
    margin: 2,
  },
  hiddenDate: {
    opacity: 0,
  },
  calendarDay: {
    flex: 1,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    margin: 1,
    borderRadius: 8,
    zIndex: 1,
    minWidth: 40,
    maxWidth: 40,
    minHeight: 40,
    maxHeight: 40,
    overflow: "visible", // Ensure task dots are visible
  },
  calendarDayContent: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "visible", // Ensure task dots are visible
  },
  dateContainer: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "visible", // Ensure task dots are visible
  },
  calendarDayText: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 13,
  },
  selectedDay: {
    backgroundColor: "#e8e7fc", // Light mode selected background
    zIndex: 3,
    elevation: 2,
    minWidth: 40,
    maxWidth: 40,
    minHeight: 40,
    maxHeight: 40,
  },
  selectedDayText: {
    color: PRIMARY,
    fontWeight: "600",
    zIndex: 4,
  },
  otherMonthText: {
    color: "#999999",
  },
  calendarDayMoveTarget: {
    borderColor: "#ffb300",
    borderWidth: 2,
  },
  taskDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: PRIMARY,
  },
  todayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  taskDotsRow: {
    position: "absolute",
    bottom: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 2.5,
  },
  todayText: {
    color: "#F2F1EB",
    fontWeight: "600",
    fontSize: 14,
  },
  dateTextContainer: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 16,
  },
  dayViewDateContainer: {
    width: 80,
    height: 80,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 40,
  },
  dayViewDayButton: {
    width: 100,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 50,
    position: "relative",
  },
  dayViewDayNumber: {
    fontSize: 48,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 56,
  },
  selectedDayLarge: {
    backgroundColor: "#3B4B7A",
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  todayCircleLarge: {
    backgroundColor: PRIMARY,
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  todayTextLarge: {
    color: "#F2F1EB",
    fontWeight: "700",
  },
  selectedDateLarge: {
    // No additional styling needed
  },
  taskDotLarge: {
    position: "absolute",
    bottom: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PRIMARY,
  },
  noTaskContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  selectedDate: {
    // No background color, just text color change
  },
  tasksContainer: {
    flex: 1,
    backgroundColor: "#f7f7fa",
  },
  taskAreaContainer: {
    flex: 1,
  },
  taskArea: {
    flex: 1,
  },
  tasksHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingHorizontal: 12,
    width: "100%",
    backgroundColor: "#f7f7fa", // Match tasks container background
    paddingTop: 8,
  },
  tasksHeader: {
    fontSize: 16,
    fontWeight: "600",
    color: "#3d3d4e",
    flex: 1,
    lineHeight: 24,
    paddingHorizontal: 12,
  },
  addButton: {
    marginLeft: 12,
    borderRadius: 20,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 40,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  addButtonIcon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    display: "flex",
  },
  addButtonText: {
    fontSize: 20,
    lineHeight: 24,
    color: "#fff",
    textAlign: "center",
    fontWeight: "bold",
  },
  taskList: {
    width: "100%",
    paddingHorizontal: 0,
  },
  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 40,
  },
  taskTextContainer: {
    flex: 1,
    marginLeft: 8,
    marginRight: 12,
    flexShrink: 1,
  },
  taskText: {
    fontSize: 17,
    color: "#333",
    textDecorationLine: "none",
    flexShrink: 1,
    maxWidth: "100%",
    fontWeight: "400",
  },
  taskTimeContainer: {
    flexShrink: 0,
    alignItems: "flex-end",
    minWidth: 60,
  },
  moveHint: {
    color: "#ffb300",
    fontWeight: "700",
    marginLeft: 10,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
    color: "#3d3d4e",
  },
  linkInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    height: 50,
  },
  linkInputContainerFocused: {
    borderColor: PRIMARY,
  },
  linkInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    paddingHorizontal: 16,
    height: 50,
    backgroundColor: "transparent",
    textAlignVertical: "center",
    borderRadius: 12,
  },
  dateTimeText: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    paddingHorizontal: 16,
    ...Platform.select({
      ios: {
        lineHeight: 50, // iOS: 使用 lineHeight 實現垂直置中
      },
      android: {
        textAlignVertical: "center",
      },
    }),
  },
  linkPreviewButton: {
    padding: 8,
    marginLeft: 8,
  },
  placeholderText: {
    color: "#888",
  },
  timeInput: {
    height: 50,
    justifyContent: "space-between",
    alignItems: "center",
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  timeInputSelected: {
    borderColor: PRIMARY,
    backgroundColor: "#f0f0ff",
  },
  timeInputText: {
    fontSize: 16,
    color: "#888",
    flex: 1,
  },
  timeInputTextFilled: {
    color: "#222",
    fontWeight: "500",
  },
  timePickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  timePickerContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    width: "90%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  timePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  timePickerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
  },
  timePickerCloseButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
  },
  timePickerBody: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  timeWheelContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  timeWheel: {
    alignItems: "center",
    marginHorizontal: 10,
  },
  timeWheelLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  timeWheelList: {
    height: 200,
    width: 80,
  },
  timeWheelContent: {
    alignItems: "center",
    paddingVertical: 75,
  },
  timeSeparator: {
    fontSize: 24,
    fontWeight: "bold",
    color: PRIMARY,
    marginHorizontal: 10,
  },
  timeWheelItem: {
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    marginVertical: 2,
  },
  timeWheelItemSelected: {
    backgroundColor: PRIMARY,
  },
  timeWheelText: {
    fontSize: 18,
    color: "#666",
    fontWeight: "500",
  },
  timeWheelTextSelected: {
    color: "#fff",
    fontWeight: "700",
  },
  timeWheelHighlight: {
    position: "absolute",
    top: 75,
    left: 0,
    right: 0,
    height: 50,
    backgroundColor: "rgba(108, 99, 255, 0.1)",
    borderRadius: 8,
    borderWidth: 2,
    borderColor: PRIMARY,
  },
  timePickerActions: {
    flexDirection: "row",
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  doneButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  simpleTimePickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  simpleTimePickerContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  simpleTimePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  simpleTimePickerCancel: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  simpleTimePickerCancelText: {
    fontSize: 16,
    color: "#666",
  },
  simpleTimePickerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  simpleTimePickerDone: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  simpleTimePickerDoneText: {
    fontSize: 16,
    color: PRIMARY,
    fontWeight: "600",
  },
  simpleTimePickerBody: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  simpleTimeInputs: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  simpleTimeInput: {
    alignItems: "center",
    flex: 1,
  },
  simpleTimeLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  simpleTimeTextInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    textAlign: "center",
    width: 80,
    backgroundColor: "#f9f9f9",
  },
  simpleTimeSeparator: {
    fontSize: 24,
    fontWeight: "bold",
    color: PRIMARY,
    marginHorizontal: 20,
  },
  timeInputContainer: {
    padding: 20,
    alignItems: "center",
  },
  timeInputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  timeNumberInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    width: 60,
    backgroundColor: "#f9f9f9",
  },
  timeColon: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#666",
    marginHorizontal: 10,
  },
  timePickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  timePickerContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  timePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  timePickerCancel: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  timePickerCancelText: {
    fontSize: 16,
    color: "#666",
  },
  timePickerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  timePickerDone: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  timePickerDoneText: {
    fontSize: 16,
    color: PRIMARY,
    fontWeight: "600",
  },
  timePickerBody: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  timeWheelContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  timeWheel: {
    alignItems: "center",
    marginHorizontal: 10,
  },
  timeWheelList: {
    height: 200,
    width: 80,
  },
  timeWheelContent: {
    alignItems: "center",
    paddingVertical: 75,
  },
  timeWheelItem: {
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    marginVertical: 2,
  },
  timeWheelItemSelected: {
    backgroundColor: PRIMARY,
  },
  timeWheelText: {
    fontSize: 18,
    color: "#666",
    fontWeight: "500",
  },
  timeWheelTextSelected: {
    color: "#fff",
    fontWeight: "700",
  },
  timeWheelHighlight: {
    position: "absolute",
    top: 75,
    left: 0,
    right: 0,
    height: 50,
    backgroundColor: "rgba(108, 99, 255, 0.1)",
    borderRadius: 8,
    borderWidth: 2,
    borderColor: PRIMARY,
  },
  timeSeparator: {
    fontSize: 24,
    fontWeight: "bold",
    color: PRIMARY,
    marginHorizontal: 10,
  },
  spinnerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  spinnerContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: 280,
    alignItems: "center",
  },
  spinnerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 20,
  },
  spinnerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  spinnerColumn: {
    alignItems: "center",
    flex: 1,
  },
  spinnerLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  spinner: {
    height: 120,
    width: 60,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
  },
  spinnerList: {
    flex: 1,
  },
  spinnerContent: {
    paddingVertical: 40,
  },
  spinnerItem: {
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  spinnerText: {
    fontSize: 16,
    color: "#333",
  },
  spinnerColon: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#666",
    marginHorizontal: 10,
  },
  spinnerButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  spinnerCancel: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
  },
  spinnerCancelText: {
    fontSize: 16,
    color: "#666",
  },
  spinnerDone: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: PRIMARY,
    alignItems: "center",
  },
  spinnerDoneText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
  taskTimeRight: {
    fontSize: 14,
    color: PRIMARY,
    fontWeight: "600",
    textAlign: "right",
  },
  timePickerModal: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  timeWheelContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    paddingVertical: 10,
  },
  timeWheel: {
    height: 200,
    width: 80,
    position: "relative",
    overflow: "hidden",
  },
  timeWheelItem: {
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  timeWheelItemSelected: {
    backgroundColor: "rgba(108, 99, 255, 0.1)",
    borderRadius: 20,
  },
  timeWheelText: {
    fontSize: 20,
    color: "#888",
  },
  timeWheelTextSelected: {
    fontSize: 24,
    color: PRIMARY,
    fontWeight: "600",
  },
  timeWheelHighlight: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "50%",
    height: 40,
    marginTop: -20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: PRIMARY,
    zIndex: -1,
  },
  timeSeparator: {
    fontSize: 28,
    marginHorizontal: 8,
    color: PRIMARY,
    fontWeight: "600",
  },
  timePickerActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    marginTop: 10,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    backgroundColor: "#f8f9fa",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 15,
    fontWeight: "500",
  },
  timePickerContent: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  timePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    width: "100%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  timePickerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#3d3d4e",
  },
  timePickerClose: {
    padding: 8,
  },
  timePickerBody: {
    backgroundColor: "#fff",
    width: "100%",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  timePicker: {
    width: "100%",
  },
  timePicker: {
    width: "100%",
  },
  doneButton: {
    padding: 12,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    marginTop: 10,
  },
  doneButtonText: {
    color: PRIMARY,
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalContent: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalScrollView: {
    flex: 1,
    ...(Platform.OS === "web" && {
      overflowY: "auto",
      WebkitOverflowScrolling: "touch",
    }),
  },
  modalFieldRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    minHeight: 44,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  inputFilled: {
    borderColor: PRIMARY,
  },
  noteInput: {
    height: 100,
    paddingTop: 12,
    paddingBottom: 12,
  },
  modalButtons: {
    minHeight: 100,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 26,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    backgroundColor: "#fff",
  },
  buttonGroup: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 6,
  },
  saveButton: {
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    minWidth: 100,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 17,
    letterSpacing: -0.41,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    ...(Platform.OS !== "web" && {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: "rgba(26,31,46,0.12)",
    }),
    ...(Platform.OS === "web" && {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
    }),
    backgroundColor: "#F2F1EB",
    zIndex: 10,
  },
  modalBackButton: {
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    width: 48,
    height: 48,
    zIndex: 999,
    backgroundColor: "transparent",
  },
  modalHeaderSpacer: {
    width: 48,
  },
  modalCloseButton: {
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButton: {
    backgroundColor: "transparent",
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 16,
    minHeight: 50,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(26,31,46,0.22)",
    alignItems: "center",
  },
  deleteButtonText: {
    color: "#B14A3E",
    fontWeight: "500",
    fontSize: 14,
  },
  taskContent: {
    flex: 1,
  },
  taskUserInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  userAvatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 6,
  },
  userDisplayName: {
    fontSize: 12,
    color: "#888",
    fontStyle: "italic",
  },
  // 簡化時間選擇器樣式
  simpleTimePickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  simpleTimePickerContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  simpleTimePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  simpleTimePickerCancel: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  simpleTimePickerCancelText: {
    fontSize: 16,
    color: "#666",
  },
  simpleTimePickerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  simpleTimePickerDone: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  simpleTimePickerDoneText: {
    fontSize: 16,
    color: PRIMARY,
    fontWeight: "600",
  },
  simpleTimePickerBody: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  simpleTimeWheelContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  simpleTimeWheel: {
    height: 200,
    width: 80,
    marginHorizontal: 10,
  },
  simpleTimeWheelContent: {
    alignItems: "center",
    paddingVertical: 75,
  },
  simpleTimeWheelItem: {
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    marginVertical: 2,
  },
  simpleTimeWheelItemSelected: {
    backgroundColor: PRIMARY,
  },
  simpleTimeWheelText: {
    fontSize: 18,
    color: "#666",
    fontWeight: "500",
  },
  simpleTimeWheelTextSelected: {
    color: "#fff",
    fontWeight: "700",
  },
  simpleTimeSeparator: {
    fontSize: 24,
    fontWeight: "bold",
    color: PRIMARY,
    marginHorizontal: 10,
  },
  // 原生時間選擇器樣式
  nativeTimePickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  nativeTimePickerContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  nativeTimePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  nativeTimePickerCancel: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  nativeTimePickerCancelText: {
    fontSize: 16,
    color: "#666",
  },
  nativeTimePickerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  nativeTimePickerDone: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  nativeTimePickerDoneText: {
    fontSize: 16,
    color: PRIMARY,
    fontWeight: "600",
  },
  nativeTimePickerBody: {
    paddingHorizontal: 20,
    paddingTop: 20,
    alignItems: "center",
  },
  nativeDateTimePicker: {
    width: 200,
    height: 200,
  },
  // 簡化的時間選擇器樣式
  timePickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  timePickerContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  timePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  timePickerCancel: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  timePickerCancelText: {
    fontSize: 16,
    color: "#666",
  },
  timePickerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  timePickerDone: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  timePickerDoneText: {
    fontSize: 16,
    color: PRIMARY,
    fontWeight: "600",
  },
  timePickerBody: {
    paddingHorizontal: 20,
    paddingTop: 20,
    alignItems: "center",
  },
  dateTimePicker: {
    width: 200,
    height: 200,
  },
  // Web 時間選擇器樣式
  webTimePicker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  webTimePickerRow: {
    alignItems: "center",
    marginHorizontal: 10,
  },
  webTimePickerLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 10,
  },
  webTimePickerColumn: {
    height: 200,
    width: 60,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  webTimePickerContent: {
    alignItems: "center",
    paddingVertical: 84, // 讓當前時間顯示在中間
  },
  webTimePickerItem: {
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 1,
    borderRadius: 4,
  },
  webTimePickerItemSelected: {
    backgroundColor: PRIMARY,
  },
  webTimePickerText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  webTimePickerTextSelected: {
    color: "#fff",
    fontWeight: "700",
  },
  webTimePickerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  webTimePickerColumn: {
    alignItems: "center",
    marginHorizontal: 15,
  },
  webTimePickerLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 10,
  },
  webTimePickerList: {
    height: 200,
    width: 80,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  webTimePickerContent: {
    paddingVertical: 85, // 讓中間的項目居中顯示
  },
  webTimePickerItem: {
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 1,
    borderRadius: 6,
    marginHorizontal: 4,
  },
  webTimePickerItemSelected: {
    backgroundColor: PRIMARY,
  },
  webTimePickerText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  webTimePickerTextSelected: {
    color: "#fff",
    fontWeight: "700",
  },
  webTimeSeparator: {
    fontSize: 28,
    fontWeight: "bold",
    color: PRIMARY,
    marginHorizontal: 10,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  headerLeftContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  headerRightContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingRight: 0,
  },
  dayNavButton: {
    alignItems: "center",
    justifyContent: "center",
  },
  dayViewHeaderContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
  },
  dayViewDateText: {
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 4,
  },
  dayViewDateNumber: {
    fontSize: 32,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 40,
  },
  dayViewMonthYear: {
    fontSize: 14,
    fontWeight: "400",
    textAlign: "center",
    marginTop: 2,
  },
  dayViewCalendarContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    minHeight: 120,
  },
  dayViewContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  todayButton: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  todayButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
  },
  taskAreaContent: {
    flex: 1,
  },
  tasksScrollContent: {
    flexGrow: 1,
    paddingTop: 0,
    paddingBottom: 80,
  },
});

export default CalendarScreen;
