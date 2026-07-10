import { useCallback } from "react";
import { FlatList, Platform, Text, View } from "react-native";
import { PanGestureHandler } from "react-native-gesture-handler";
import Svg, { Line, Circle, Rect } from "react-native-svg";
import IndigoFAB from "../IndigoFAB";
import { isIOS26Plus } from "../../utils/platform";
import { styles } from "../../screens/CalendarScreen.styles";
import { TaskItem, TaskSkeleton } from "./TaskItem";

function getToday() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Format Date to YYYY-MM-DD in local time (avoid UTC shift in getAdjacentDate)
const toLocalDateStr = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Helper to get previous/next day in YYYY-MM-DD (local time)
const getAdjacentDate = (dateStr, diff) => {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + diff);
  return toLocalDateStr(date);
};

export function TaskListArea({
  theme,
  t,
  isZH,
  tasks,
  isLoadingTasks,
  selectedDate,
  setSelectedDate,
  moveMode,
  taskToMove,
  onToggle,
  onEdit,
  onStartMove,
  onAddTask,
}) {
  const renderTask = useCallback(
    ({ item }) => (
      <TaskItem
        item={item}
        theme={theme}
        t={t}
        isMoveTarget={moveMode && taskToMove?.id === item.id}
        onToggle={onToggle}
        onEdit={onEdit}
        onLongPress={onStartMove}
      />
    ),
    [theme, t, moveMode, taskToMove, onToggle, onEdit, onStartMove],
  );

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

  const dayTasks = tasks[selectedDate] || [];
  // 如果正在載入且還沒有任何任務數據，顯示 skeleton
  const shouldShowSkeleton = isLoadingTasks && Object.keys(tasks).length === 0;

  const [selY, selM, selD] = selectedDate.split("-").map(Number);
  const selDateObj = new Date(selY, selM - 1, selD);
  const weekDayAbbrList = t.weekDayAbbr || [
    "SUN",
    "MON",
    "TUE",
    "WED",
    "THU",
    "FRI",
    "SAT",
  ];
  const weekDayAbbr = weekDayAbbrList[selDateObj.getDay()];
  const isSelectedToday = selectedDate === getToday();
  const selMonthName = t.months ? t.months[selM - 1] : String(selM);
  const bannerDateLabel = isSelectedToday
    ? t.today || "Today"
    : isZH
      ? `${selM} 月 ${selD} 日`
      : `${selMonthName} ${selD}`;
  const completedCount = dayTasks.filter((t) => t.is_completed).length;
  const totalCount = dayTasks.length;

  const taskAreaContent = (
    <View
      style={[styles.taskArea, { flex: 1, backgroundColor: theme.background }]}
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
              {weekDayAbbr}
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
          onPress={() => onAddTask(selectedDate)}
          theme={theme}
          isNative={isIOS26Plus}
        />

        {shouldShowSkeleton ? (
          <View style={{ flex: 1, backgroundColor: theme.background }}>
            <FlatList
              data={[1, 2, 3, 4]} // 顯示 4 個 skeleton
              keyExtractor={(item) => `skeleton-${item}`}
              renderItem={({ index }) => (
                <TaskSkeleton theme={theme} widthIndex={index} />
              )}
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
              <Circle cx="36" cy="16" r="6" fill="#e0e0e0" />
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
                const aCompleted = a.is_completed;
                const bCompleted = b.is_completed;
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
}
