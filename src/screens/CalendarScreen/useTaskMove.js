import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { TaskService } from "../../services/taskService";
import { widgetService } from "../../services/widgetService";
import { dataPreloadService } from "../../services/dataPreloadService";

// 拖曳（長按選取任務 → 點日期放下）邏輯，從 CalendarScreen 抽出。
export function useTaskMove({ tasks, setTasks, selectedDate, t }) {
  const [moveMode, setMoveMode] = useState(false);
  const [taskToMove, setTaskToMove] = useState(null);

  const startMoveTask = useCallback(
    (task) => {
      setMoveMode(true);
      setTaskToMove(task);
      Alert.alert(t.moveTask, t.moveTaskAlert, [{ text: t.confirm }]);
    },
    [t],
  );

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
    dataPreloadService.updateCachedCalendarTasks(updatedTasks);

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
      dataPreloadService.updateCachedCalendarTasks(previousTasks);
      Alert.alert(t.error, t.moveTaskFailed);
    }
  };

  // 合併月曆格（CalendarGrid 的 renderCalendar）原本重複兩份的「放下任務」
  // 三行邏輯，行為與原本重複程式碼一致：呼叫端只需在 moveMode && taskToMove
  // 為真時呼叫本函式。
  const dropTaskOnDate = (toDate) => {
    moveTaskToDate(taskToMove, toDate);
    setMoveMode(false);
    setTaskToMove(null);
  };

  return {
    moveMode,
    taskToMove,
    startMoveTask,
    moveTaskToDate,
    dropTaskOnDate,
  };
}
