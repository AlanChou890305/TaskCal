import WidgetKit
import SwiftUI

private let appGroupId   = "group.com.cty0305.too.doo.list.data"
private let widgetDataKey = "widgetTasksByDate"

// Indigo G2 palette — light
private let palAccent  = Color(red: 59/255,  green: 75/255,  blue: 122/255)  // #3B4B7A
private let palPaper   = Color(red: 242/255, green: 241/255, blue: 235/255)  // #F2F1EB
private let palInk     = Color(red: 26/255,  green: 31/255,  blue: 46/255)   // #1A1F2E
private let palInk3    = Color(red: 142/255, green: 148/255, blue: 170/255)  // #8E94AA
// Dark
private let palAccentDk = Color(red: 139/255, green: 152/255, blue: 208/255) // #8B98D0
private let palPaperDk  = Color(red: 20/255,  green: 24/255,  blue: 42/255)  // #14182A
private let palInkDk    = Color(red: 236/255, green: 233/255, blue: 226/255) // #ECE9E2
private let palInk3Dk   = Color(red: 124/255, green: 129/255, blue: 152/255) // #7C8198

struct TaskCalWidgetEntry: TimelineEntry {
  let date: Date
  let tasks: [WidgetTask]
  let tasksByDate: [String: [WidgetTask]]
}

struct WidgetTask: Codable {
  let id: String
  let title: String
  let time: String
  let completed: Bool

  var formattedTime: String {
    if time.isEmpty { return "" }
    let parts = time.split(separator: ":")
    if parts.count >= 2 { return "\(parts[0]):\(parts[1])" }
    return time
  }
}

// ── Large widget calendar helpers ─────────────────────────────────────────────
private struct CalendarDay {
  let day: Int
  let isCurrentMonth: Bool
  let isToday: Bool
  let dateString: String  // "yyyy-MM-dd"
}

private func buildCalendarDays(for date: Date) -> [CalendarDay] {
  let cal = Calendar.current
  var comps = cal.dateComponents([.year, .month, .day], from: date)
  let year      = comps.year!
  let month     = comps.month!
  let todayDay  = comps.day!

  comps.day = 1
  let firstOfMonth   = cal.date(from: comps)!
  let firstWeekday   = cal.component(.weekday, from: firstOfMonth)  // 1=Sun
  let daysInMonth    = cal.range(of: .day, in: .month, for: firstOfMonth)!.count

  let prevMonthDate  = cal.date(byAdding: .month, value: -1, to: firstOfMonth)!
  let daysInPrevMonth = cal.range(of: .day, in: .month, for: prevMonthDate)!.count
  let prevYear       = cal.component(.year,  from: prevMonthDate)
  let prevMonthNum   = cal.component(.month, from: prevMonthDate)

  let nextMonthDate  = cal.date(byAdding: .month, value: 1, to: firstOfMonth)!
  let nextYear       = cal.component(.year,  from: nextMonthDate)
  let nextMonthNum   = cal.component(.month, from: nextMonthDate)

  var days: [CalendarDay] = []

  // Leading days from previous month
  let leadingCount = firstWeekday - 1
  for i in (0..<leadingCount).reversed() {
    let d = daysInPrevMonth - i
    days.append(CalendarDay(
      day: d, isCurrentMonth: false, isToday: false,
      dateString: String(format: "%04d-%02d-%02d", prevYear, prevMonthNum, d)
    ))
  }

  // Current month days
  guard daysInMonth > 0 else { return days }
  for d in 1...daysInMonth {
    days.append(CalendarDay(
      day: d, isCurrentMonth: true, isToday: d == todayDay,
      dateString: String(format: "%04d-%02d-%02d", year, month, d)
    ))
  }

  // Trailing days to fill 5 or 6 rows
  let totalCells = days.count <= 35 ? 35 : 42
  var nextDay = 1
  while days.count < totalCells && nextDay <= 14 {
    days.append(CalendarDay(
      day: nextDay, isCurrentMonth: false, isToday: false,
      dateString: String(format: "%04d-%02d-%02d", nextYear, nextMonthNum, nextDay)
    ))
    nextDay += 1
  }

  return days
}

private func monthName(from date: Date) -> String {
  let fmt = DateFormatter()
  fmt.locale = Locale(identifier: "en_US")
  fmt.dateFormat = "MMMM"
  return fmt.string(from: date)
}

private func weekdayAbbr(from date: Date) -> String {
  let fmt = DateFormatter()
  fmt.locale = Locale(identifier: "en_US")
  return fmt.shortWeekdaySymbols[Calendar.current.component(.weekday, from: date) - 1].uppercased()
}

// ── Widget definition ─────────────────────────────────────────────────────────
struct TaskCalWidget: Widget {
  let kind: String = "TaskCalWidget"

  private static var supportedFamilyList: [WidgetFamily] {
    #if os(iOS)
    if #available(iOS 16.0, *) {
      return [.systemSmall, .systemMedium, .systemLarge, .accessoryCircular, .accessoryRectangular, .accessoryInline]
    }
    #endif
    return [.systemSmall, .systemMedium, .systemLarge]
  }

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: TaskCalWidgetProvider()) { entry in
      TaskCalWidgetView(entry: entry)
    }
    .configurationDisplayName("Today's Tasks")
    .description("View your today's to-do list on the home screen.")
    .supportedFamilies(TaskCalWidget.supportedFamilyList)
    .contentMarginsDisabled()
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────
struct TaskCalWidgetProvider: TimelineProvider {
  func placeholder(in context: Context) -> TaskCalWidgetEntry {
    TaskCalWidgetEntry(date: Date(), tasks: [
      WidgetTask(id: "1", title: "Morning stand-up", time: "09:30", completed: true),
      WidgetTask(id: "2", title: "Lunch with Mei",   time: "12:00", completed: false),
      WidgetTask(id: "3", title: "Draft Q2 plan",    time: "14:00", completed: false),
    ], tasksByDate: [:])
  }

  func getSnapshot(in context: Context, completion: @escaping (TaskCalWidgetEntry) -> Void) {
    let tasksByDate = loadAllTasksByDate()
    let today = todayKey()
    completion(TaskCalWidgetEntry(date: Date(), tasks: tasksByDate[today] ?? [], tasksByDate: tasksByDate))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<TaskCalWidgetEntry>) -> Void) {
    let tasksByDate = loadAllTasksByDate()
    let today       = todayKey()
    let tasks       = tasksByDate[today] ?? []
    let entry       = TaskCalWidgetEntry(date: Date(), tasks: tasks, tasksByDate: tasksByDate)
    let cal         = Calendar.current
    let tmrw        = cal.startOfDay(for: Date().addingTimeInterval(86400))
    let midnight    = cal.date(byAdding: .minute, value: 1, to: tmrw) ?? tmrw
    let nextHour    = cal.date(byAdding: .hour,   value: 1, to: Date()) ?? Date()
    completion(Timeline(entries: [entry], policy: .after(min(midnight, nextHour))))
  }

  private func todayKey() -> String {
    let fmt = DateFormatter(); fmt.dateFormat = "yyyy-MM-dd"
    return fmt.string(from: Date())
  }

  private func loadAllTasksByDate() -> [String: [WidgetTask]] {
    guard let store = UserDefaults(suiteName: appGroupId),
          let json  = store.string(forKey: widgetDataKey),
          let data  = json.data(using: .utf8),
          let dict  = try? JSONDecoder().decode([String: [WidgetTask]].self, from: data)
    else { return [:] }
    return dict
  }
}

// "WED · APR" — weekday + month, no day number
private func kickerString(from date: Date) -> String {
  let cal = Calendar.current
  let fmt = DateFormatter()
  fmt.locale = Locale(identifier: "en_US")
  let wd = fmt.shortWeekdaySymbols[cal.component(.weekday, from: date) - 1].uppercased()
  let mo = fmt.shortMonthSymbols[cal.component(.month,   from: date) - 1].uppercased()
  return "\(wd) · \(mo)"
}

// ── Task row (small / medium) ─────────────────────────────────────────────────
struct TaskRowView: View {
  let task: WidgetTask
  @Environment(\.colorScheme) var colorScheme

  var body: some View {
    let isDark = colorScheme == .dark
    let fg  = isDark ? palInkDk   : palInk
    let fg3 = isDark ? palInk3Dk  : palInk3
    let acc = isDark ? palAccentDk : palAccent
    let bg  = isDark ? palPaperDk : palPaper

    HStack(alignment: .center, spacing: 6) {
      ZStack {
        RoundedRectangle(cornerRadius: 2.5)
          .fill(task.completed ? acc : Color.clear)
          .frame(width: 11, height: 11)
        RoundedRectangle(cornerRadius: 2.5)
          .stroke(task.completed ? acc : fg3, lineWidth: 1.4)
          .frame(width: 11, height: 11)
        if task.completed {
          Image(systemName: "checkmark")
            .font(.system(size: 6.5, weight: .bold))
            .foregroundColor(bg)
        }
      }

      Text(task.title)
        .font(.system(size: 10, weight: .medium))
        .foregroundColor(task.completed ? fg3 : fg)
        .strikethrough(task.completed)
        .lineLimit(1)
        .truncationMode(.tail)

      Spacer(minLength: 0)

      if !task.formattedTime.isEmpty {
        Text(task.formattedTime)
          .font(.system(size: 9, weight: .medium, design: .monospaced))
          .foregroundColor(task.completed ? fg3 : acc)
          .kerning(-0.2)
      }
    }
  }
}

// ── Task row (large widget — bigger fonts) ────────────────────────────────────
struct LargeTaskRowView: View {
  let task: WidgetTask
  @Environment(\.colorScheme) var colorScheme

  var body: some View {
    let isDark = colorScheme == .dark
    let fg  = isDark ? palInkDk   : palInk
    let fg3 = isDark ? palInk3Dk  : palInk3
    let acc = isDark ? palAccentDk : palAccent
    let bg  = isDark ? palPaperDk : palPaper

    HStack(alignment: .center, spacing: 8) {
      ZStack {
        RoundedRectangle(cornerRadius: 3)
          .fill(task.completed ? acc : Color.clear)
          .frame(width: 14, height: 14)
        RoundedRectangle(cornerRadius: 3)
          .stroke(task.completed ? acc : fg3, lineWidth: 1.5)
          .frame(width: 14, height: 14)
        if task.completed {
          Image(systemName: "checkmark")
            .font(.system(size: 8, weight: .bold))
            .foregroundColor(bg)
        }
      }

      Text(task.title)
        .font(.system(size: 13, weight: .medium))
        .foregroundColor(task.completed ? fg3 : fg)
        .strikethrough(task.completed)
        .lineLimit(1)
        .truncationMode(.tail)

      Spacer(minLength: 0)

      if !task.formattedTime.isEmpty {
        Text(task.formattedTime)
          .font(.system(size: 11, weight: .medium, design: .monospaced))
          .foregroundColor(task.completed ? fg3 : acc)
          .kerning(-0.2)
      }
    }
  }
}

// ── Widget view ───────────────────────────────────────────────────────────────
struct TaskCalWidgetView: View {
  @Environment(\.widgetFamily) var family
  @Environment(\.colorScheme) var colorScheme
  var entry: TaskCalWidgetEntry

  private var isAccessory: Bool {
    #if os(iOS)
    if #available(iOS 16.0, *) {
      return family == .accessoryCircular
          || family == .accessoryRectangular
          || family == .accessoryInline
    }
    #endif
    return false
  }

  var body: some View {
    let isDark    = colorScheme == .dark
    let bg        = isDark ? palPaperDk  : palPaper
    let fg        = isDark ? palInkDk    : palInk
    let fg3       = isDark ? palInk3Dk   : palInk3
    let acc       = isDark ? palAccentDk : palAccent
    let div       = fg.opacity(isDark ? 0.08 : 0.12)
    let sorted    = entry.tasks.sorted { !$0.completed && $1.completed }
    let maxVis    = family == .systemSmall ? 3 : (family == .systemLarge ? 4 : 6)
    let visible   = Array(sorted.prefix(maxVis))
    let todoCount = entry.tasks.filter { !$0.completed }.count
    let doneCount = entry.tasks.filter { $0.completed }.count
    let total     = entry.tasks.count
    let dayNum    = Calendar.current.component(.day, from: entry.date)
    let kicker    = kickerString(from: entry.date)
    let nextTime  = entry.tasks
      .filter { !$0.completed && !$0.time.isEmpty }
      .sorted { $0.time < $1.time }
      .first?.formattedTime ?? ""

    if #available(iOS 17.0, *) {
      #if os(iOS)
      layoutView(
        isDark: isDark, fg: fg, fg3: fg3, acc: acc, div: div,
        visible: visible, todoCount: todoCount, doneCount: doneCount,
        total: total, dayNum: dayNum, kicker: kicker, nextTime: nextTime,
        tasksByDate: entry.tasksByDate
      )
      .containerBackground(isAccessory ? .clear : bg, for: .widget)
      #else
      layoutView(
        isDark: isDark, fg: fg, fg3: fg3, acc: acc, div: div,
        visible: visible, todoCount: todoCount, doneCount: doneCount,
        total: total, dayNum: dayNum, kicker: kicker, nextTime: nextTime,
        tasksByDate: entry.tasksByDate
      )
      .containerBackground(bg, for: .widget)
      #endif
    } else {
      layoutView(
        isDark: isDark, fg: fg, fg3: fg3, acc: acc, div: div,
        visible: visible, todoCount: todoCount, doneCount: doneCount,
        total: total, dayNum: dayNum, kicker: kicker, nextTime: nextTime,
        tasksByDate: entry.tasksByDate
      )
      #if os(iOS)
      .background(isAccessory ? Color.clear : bg)
      #else
      .background(bg)
      #endif
    }
  }

  @ViewBuilder
  private func layoutView(
    isDark: Bool, fg: Color, fg3: Color, acc: Color, div: Color,
    visible: [WidgetTask], todoCount: Int, doneCount: Int,
    total: Int, dayNum: Int, kicker: String, nextTime: String,
    tasksByDate: [String: [WidgetTask]]
  ) -> some View {
    if family == .systemLarge {
      largeLayout(
        isDark: isDark, fg: fg, fg3: fg3, acc: acc, div: div,
        tasks: entry.tasks, doneCount: doneCount, total: total,
        date: entry.date, tasksByDate: tasksByDate
      )
    } else if family == .systemMedium {
      mediumLayout(
        isDark: isDark, fg: fg, fg3: fg3, acc: acc, div: div,
        visible: visible, doneCount: doneCount, total: total,
        dayNum: dayNum, kicker: kicker
      )
    } else {
      #if os(iOS)
      if #available(iOS 16.0, *) {
        if family == .accessoryInline {
          accessoryInlineLayout(doneCount: doneCount, total: total, nextTime: nextTime)
        } else if family == .accessoryCircular {
          accessoryCircularLayout(doneCount: doneCount, total: total)
        } else if family == .accessoryRectangular {
          accessoryRectangularLayout(visible: visible, todoCount: todoCount)
        } else {
          smallLayout(
            isDark: isDark, fg: fg, fg3: fg3, acc: acc, div: div,
            visible: visible, todoCount: todoCount, total: total, dayNum: dayNum, kicker: kicker
          )
        }
      } else {
        smallLayout(
          isDark: isDark, fg: fg, fg3: fg3, acc: acc, div: div,
          visible: visible, todoCount: todoCount, total: total, dayNum: dayNum, kicker: kicker
        )
      }
      #else
      smallLayout(
        isDark: isDark, fg: fg, fg3: fg3, acc: acc, div: div,
        visible: visible, todoCount: todoCount, total: total, dayNum: dayNum, kicker: kicker
      )
      #endif
    }
  }

  // ── Lock screen: Inline ───────────────────────────────────────────────────
  @ViewBuilder
  private func accessoryInlineLayout(doneCount: Int, total: Int, nextTime: String) -> some View {
    if total == 0 || doneCount == total {
      Label(total == 0 ? "No tasks today" : "All \(total) done", systemImage: "checkmark")
    } else {
      let next = nextTime.isEmpty ? "" : " · Next \(nextTime)"
      Label("\(doneCount) of \(total) done\(next)", systemImage: "checkmark")
    }
  }

  // ── Lock screen: Circular ─────────────────────────────────────────────────
  @ViewBuilder
  private func accessoryCircularLayout(doneCount: Int, total: Int) -> some View {
    if #available(iOS 16.0, *) {
      let progress = total > 0 ? Double(doneCount) / Double(total) : 0
      Gauge(value: progress) {
        EmptyView()
      } currentValueLabel: {
        if total == 0 {
          Image(systemName: "checklist")
            .font(.system(size: 13, weight: .medium))
        } else {
          VStack(spacing: -1) {
            Text("\(doneCount)/\(total)")
              .font(.system(size: 13, weight: .semibold, design: .rounded))
            Text("DONE")
              .font(.system(size: 6, weight: .semibold, design: .monospaced))
              .kerning(0.4)
          }
        }
      }
      .gaugeStyle(.accessoryCircular)
    } else {
      VStack(spacing: 0) {
        Text("\(doneCount)/\(total)")
          .font(.system(size: 14, weight: .semibold, design: .rounded))
        Text("DONE")
          .font(.system(size: 7, weight: .medium, design: .monospaced))
      }
    }
  }

  // ── Lock screen: Rectangular ──────────────────────────────────────────────
  @ViewBuilder
  private func accessoryRectangularLayout(visible: [WidgetTask], todoCount: Int) -> some View {
    let pending = Array(visible.filter { !$0.completed }.prefix(2))
    VStack(alignment: .leading, spacing: 3) {
      HStack(spacing: 4) {
        Image(systemName: "checklist")
          .font(.system(size: 7, weight: .medium))
        Text(todoCount == 0 ? "TASKCAL · ALL DONE" : "TASKCAL · \(todoCount) LEFT")
          .font(.system(size: 7, weight: .semibold, design: .monospaced))
          .kerning(0.6)
      }
      .opacity(0.6)

      if pending.isEmpty {
        Text("All clear today")
          .font(.system(size: 13, weight: .medium))
      } else {
        ForEach(pending, id: \.id) { task in
          HStack(alignment: .center) {
            Text(task.title)
              .font(.system(size: 13, weight: .medium))
              .lineLimit(1)
            Spacer(minLength: 4)
            if !task.formattedTime.isEmpty {
              Text(task.formattedTime)
                .font(.system(size: 12, weight: .regular, design: .monospaced))
                .opacity(0.7)
            }
          }
        }
        if todoCount > 2 {
          Text("+\(todoCount - 2) more")
            .font(.system(size: 11, weight: .regular))
            .opacity(0.5)
        }
      }
      Spacer(minLength: 0)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  }

  // ── Small layout ──────────────────────────────────────────────────────────
  @ViewBuilder
  private func smallLayout(
    isDark: Bool, fg: Color, fg3: Color, acc: Color, div: Color,
    visible: [WidgetTask], todoCount: Int, total: Int, dayNum: Int, kicker: String
  ) -> some View {
    VStack(alignment: .leading, spacing: 0) {
      HStack(alignment: .top) {
        VStack(alignment: .leading, spacing: 0) {
          Text(kicker)
            .font(.system(size: 8, weight: .medium, design: .monospaced))
            .foregroundColor(acc)
            .kerning(1.0)
            .lineLimit(1)
          Text("\(dayNum)")
            .font(.system(size: 28, weight: .semibold))
            .foregroundColor(fg)
            .kerning(-1)
        }
        Spacer(minLength: 0)
        if todoCount > 0 {
          Text("\(todoCount) TODO")
            .font(.system(size: 7.5, weight: .semibold, design: .monospaced))
            .foregroundColor(isDark ? palPaperDk : palPaper)
            .kerning(0.5)
            .padding(.horizontal, 6)
            .padding(.vertical, 3)
            .background(acc)
            .cornerRadius(3)
        } else {
          Image(systemName: "checkmark.circle")
            .font(.system(size: 11))
            .foregroundColor(acc)
        }
      }
      .padding(.bottom, 6)

      Rectangle()
        .fill(div)
        .frame(height: 1)
        .padding(.bottom, 8)

      if visible.isEmpty {
        HStack(spacing: 6) {
          Image(systemName: "checkmark.circle")
            .font(.system(size: 10))
            .foregroundColor(acc)
          Text("All clear today")
            .font(.system(size: 10))
            .foregroundColor(fg3)
        }
      } else {
        VStack(alignment: .leading, spacing: 6) {
          ForEach(visible, id: \.id) { task in
            TaskRowView(task: task)
          }
          let overflow = total - visible.count
          if overflow > 0 {
            Text("+\(overflow) more")
              .font(.system(size: 9, weight: .medium))
              .foregroundColor(acc)
          }
        }
      }

      Spacer(minLength: 0)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .padding(.horizontal, 16)
    .padding(.top, 16)
    .padding(.bottom, 16)
  }

  // ── Medium layout — left: date + DONE, right: task list ──────────────────
  @ViewBuilder
  private func mediumLayout(
    isDark: Bool, fg: Color, fg3: Color, acc: Color, div: Color,
    visible: [WidgetTask], doneCount: Int, total: Int, dayNum: Int, kicker: String
  ) -> some View {
    HStack(alignment: .top, spacing: 0) {
      VStack(alignment: .leading, spacing: 0) {
        Text(kicker)
          .font(.system(size: 8, weight: .medium, design: .monospaced))
          .foregroundColor(acc)
          .kerning(1.0)
          .lineLimit(1)
        Text("\(dayNum)")
          .font(.system(size: 28, weight: .semibold))
          .foregroundColor(fg)
          .kerning(-1)
        Spacer(minLength: 0)
        Text("DONE")
          .font(.system(size: 7, weight: .medium, design: .monospaced))
          .foregroundColor(fg3)
          .kerning(1.0)
        Text("\(doneCount) / \(total)")
          .font(.system(size: 20, weight: .semibold, design: .monospaced))
          .foregroundColor(acc)
          .kerning(-4)
      }
      .frame(width: 72)

      Rectangle()
        .fill(div)
        .frame(width: 1)

      VStack(alignment: .leading, spacing: 7) {
        if visible.isEmpty {
          HStack(spacing: 6) {
            Image(systemName: "checkmark.circle")
              .font(.system(size: 10))
              .foregroundColor(acc)
            Text("All clear today")
              .font(.system(size: 10))
              .foregroundColor(fg3)
          }
        } else {
          ForEach(visible, id: \.id) { task in
            TaskRowView(task: task)
          }
          let overflow = total - visible.count
          if overflow > 0 {
            Text("+\(overflow) more")
              .font(.system(size: 9, weight: .medium))
              .foregroundColor(acc)
          }
        }
        Spacer(minLength: 0)
      }
      .padding(.leading, 12)
      .frame(maxWidth: .infinity, alignment: .topLeading)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .padding(.horizontal, 12)
    .padding(.top, 14)
    .padding(.bottom, 14)
  }

  // ── Large layout — full-month calendar + today's task list ────────────────
  @ViewBuilder
  private func largeLayout(
    isDark: Bool, fg: Color, fg3: Color, acc: Color, div: Color,
    tasks: [WidgetTask], doneCount: Int, total: Int,
    date: Date, tasksByDate: [String: [WidgetTask]]
  ) -> some View {
    let cal           = Calendar.current
    let year          = cal.component(.year, from: date)
    let weekday       = weekdayAbbr(from: date)
    let calDays       = buildCalendarDays(for: date)
    let rows          = calDays.count / 7
    let is6Row        = rows == 6
    let timeSorted    = tasks.sorted { $0.time < $1.time }
    let visible       = Array(timeSorted.prefix(is6Row ? 3 : 4))
    let weekdayLabels = ["S", "M", "T", "W", "T", "F", "S"]

    VStack(alignment: .leading, spacing: 0) {
      // ── Month header ──────────────────────────────────────────────────────
      HStack(alignment: .top) {
        VStack(alignment: .leading, spacing: 1) {
          Text("\(year)")
            .font(.system(size: 10, weight: .medium))
            .foregroundColor(fg3)
          Text(monthName(from: date))
            .font(.system(size: 22, weight: .bold))
            .foregroundColor(fg)
            .kerning(-0.5)
        }
        Spacer()
        Text("TODAY")
          .font(.system(size: 9, weight: .bold, design: .monospaced))
          .kerning(0.8)
          .foregroundColor(isDark ? palPaperDk : palPaper)
          .padding(.horizontal, 10)
          .padding(.vertical, 5)
          .background(acc)
          .cornerRadius(4)
      }
      .padding(.bottom, is6Row ? 5 : 8)

      // ── Weekday labels ────────────────────────────────────────────────────
      HStack(spacing: 0) {
        ForEach(weekdayLabels.indices, id: \.self) { i in
          Text(weekdayLabels[i])
            .font(.system(size: 9, weight: .medium))
            .foregroundColor(fg3)
            .frame(maxWidth: .infinity)
        }
      }
      .padding(.bottom, is6Row ? 2 : 4)

      // ── Calendar grid ─────────────────────────────────────────────────────
      VStack(spacing: 0) {
        ForEach(0..<rows, id: \.self) { row in
          HStack(spacing: 0) {
            ForEach(0..<7, id: \.self) { col in
              let idx = row * 7 + col
              if idx < calDays.count {
                calDayCell(
                  calDay: calDays[idx], isDark: isDark,
                  fg: fg, fg3: fg3, acc: acc, tasksByDate: tasksByDate
                )
              }
            }
          }
        }
      }
      .padding(.bottom, is6Row ? 3 : 7)

      // ── Divider + weekday summary ──────────────────────────────────────────
      Rectangle().fill(div).frame(height: 1)

      HStack {
        Spacer()
        Text("\(weekday) · \(doneCount) / \(total) DONE")
          .font(.system(size: 9, weight: .medium, design: .monospaced))
          .foregroundColor(fg3)
          .kerning(0.5)
        Spacer()
      }
      .padding(.vertical, is6Row ? 5 : 7)

      Rectangle().fill(div).frame(height: 1)
        .padding(.bottom, is6Row ? 6 : 9)

      // ── Task list ─────────────────────────────────────────────────────────
      if visible.isEmpty {
        HStack(spacing: 6) {
          Image(systemName: "checkmark.circle")
            .font(.system(size: 11))
            .foregroundColor(acc)
          Text("All clear today")
            .font(.system(size: 12))
            .foregroundColor(fg3)
        }
      } else {
        VStack(alignment: .leading, spacing: is6Row ? 6 : 8) {
          ForEach(visible, id: \.id) { task in
            LargeTaskRowView(task: task)
          }
          let overflow = tasks.count - visible.count
          if overflow > 0 {
            Text("+\(overflow) more")
              .font(.system(size: 11, weight: .medium))
              .foregroundColor(acc)
          }
        }
      }

      Spacer(minLength: 0)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .padding(.horizontal, 14)
    .padding(.top, 18)
    .padding(.bottom, is6Row ? 10 : 12)
  }

  // ── Calendar day cell ─────────────────────────────────────────────────────
  @ViewBuilder
  private func calDayCell(
    calDay: CalendarDay, isDark: Bool,
    fg: Color, fg3: Color, acc: Color,
    tasksByDate: [String: [WidgetTask]]
  ) -> some View {
    let hasTasks  = tasksByDate[calDay.dateString]?.isEmpty == false
    let textColor: Color = calDay.isToday
      ? (isDark ? palPaperDk : palPaper)
      : (calDay.isCurrentMonth ? fg : fg3.opacity(0.55))

    VStack(spacing: 1) {
      ZStack {
        if calDay.isToday {
          Circle()
            .fill(acc)
            .frame(width: 20, height: 20)
        }
        Text("\(calDay.day)")
          .font(.system(size: 11, weight: calDay.isToday ? .bold : .regular))
          .foregroundColor(textColor)
      }
      .frame(width: 20, height: 20)

      // Task dot — visible only for current-month days with tasks
      Circle()
        .fill(hasTasks && calDay.isCurrentMonth ? acc.opacity(0.65) : Color.clear)
        .frame(width: 3, height: 3)
    }
    .frame(maxWidth: .infinity)
  }
}

// ── Previews ──────────────────────────────────────────────────────────────────
struct TaskCalWidget_Previews: PreviewProvider {
  static var previews: some View {
    let tasks = [
      WidgetTask(id: "1", title: "Morning stand-up", time: "09:30", completed: true),
      WidgetTask(id: "2", title: "Design tokens",    time: "10:30", completed: true),
      WidgetTask(id: "3", title: "Lunch w/ Mei",     time: "12:00", completed: false),
      WidgetTask(id: "4", title: "Draft Q2 plan",    time: "14:00", completed: false),
    ]
    let today = String(format: "%04d-%02d-%02d",
      Calendar.current.component(.year,  from: Date()),
      Calendar.current.component(.month, from: Date()),
      Calendar.current.component(.day,   from: Date()))
    let sampleByDate: [String: [WidgetTask]] = [today: tasks]
    let entry = TaskCalWidgetEntry(date: Date(), tasks: tasks, tasksByDate: sampleByDate)

    Group {
      TaskCalWidgetView(entry: entry)
        .previewContext(WidgetPreviewContext(family: .systemSmall))

      TaskCalWidgetView(entry: entry)
        .previewContext(WidgetPreviewContext(family: .systemMedium))

      TaskCalWidgetView(entry: entry)
        .previewContext(WidgetPreviewContext(family: .systemLarge))

      TaskCalWidgetView(entry: entry)
        .previewContext(WidgetPreviewContext(family: .systemLarge))
        .preferredColorScheme(.dark)

      #if os(iOS)
      if #available(iOS 16.0, *) {
        TaskCalWidgetView(entry: entry)
          .previewContext(WidgetPreviewContext(family: .accessoryInline))

        TaskCalWidgetView(entry: entry)
          .previewContext(WidgetPreviewContext(family: .accessoryCircular))

        TaskCalWidgetView(entry: entry)
          .previewContext(WidgetPreviewContext(family: .accessoryRectangular))
      }
      #endif
    }
  }
}
