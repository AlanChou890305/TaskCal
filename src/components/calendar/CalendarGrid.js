import { memo, useMemo, useRef } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { styles } from "../../screens/CalendarScreen.styles";
import { parseLocalDateStr } from "../../utils/dateUtils";

// Format Date to YYYY-MM-DD in local time (avoid UTC shift in getMonthDates)
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
    dates.push(toLocalDateStr(new Date(year, month - 1, prevMonthLastDay - i)));
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

const EN_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const CalendarGrid = memo(function CalendarGrid({
  theme,
  t,
  language,
  visibleYear,
  setVisibleYear,
  visibleMonth,
  setVisibleMonth,
  selectedDate,
  setSelectedDate,
  tasks,
  moveMode,
  taskToMove,
  dropTaskOnDate,
  getCurrentDate,
  scrollViewRef,
}) {
  const lastScrollY = useRef(0); // Track last scroll position for month detection
  const scrollStartY = useRef(0); // Track scroll start position for swipe detection
  const isScrolling = useRef(false); // Track if user is actively scrolling

  const monthDates = useMemo(
    () => getMonthDates(visibleYear, visibleMonth),
    [visibleYear, visibleMonth],
  );

  const renderCalendar = () => {
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
                    fontFamily:
                      theme.typography?.monoSection?.fontFamily ||
                      "JetBrainsMono_500Medium",
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
                const dateObj = parseLocalDateStr(dateStr);
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
                        dropTaskOnDate(dateStr);
                      } else {
                        setSelectedDate(dateStr);
                      }
                    }}
                    style={[
                      styles.calendarDay,
                      { backgroundColor: theme.background },
                      moveMode && styles.calendarDayMoveTarget,
                    ]}
                    activeOpacity={0.7}
                  >
                    {/* Circle directly centered by calendarDay's own flexbox */}
                    <View
                      style={[
                        styles.dayCircle,
                        isToday && { backgroundColor: theme.primary },
                        isSelected &&
                          !isToday && {
                            borderWidth: 1.5,
                            borderColor: theme.primary,
                          },
                      ]}
                    >
                      <Text
                        style={[
                          styles.calendarDayText,
                          { fontFamily: theme.typography?.monoDay?.fontFamily },
                          {
                            color: isCurrentMonth
                              ? theme.text
                              : theme.textTertiary,
                          },
                          isSelected && !isToday && { color: theme.primary },
                          isToday && {
                            color: theme.buttonText || "#F2F1EB",
                            fontWeight: "600",
                          },
                        ]}
                      >
                        {dateObj.getDate()}
                      </Text>
                    </View>
                    {/* Dot absolutely positioned relative to calendarDay */}
                    {taskCount > 0 && (
                      <View
                        style={{
                          position: "absolute",
                          bottom: 4,
                          width: 4,
                          height: 4,
                          borderRadius: 2,
                          backgroundColor: theme.primary,
                        }}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
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
                  lineHeight: 42,
                  color: theme.text,
                }}
              >
                {monthName}
              </Text>
              {secondaryMonthName ? (
                <Text
                  style={{
                    fontFamily:
                      theme.typography?.callout?.fontFamily ||
                      "InterTight_500Medium",
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
              setVisibleMonth(parseLocalDateStr(today).getMonth());
              setVisibleYear(parseLocalDateStr(today).getFullYear());
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

  return (
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
  );
});
