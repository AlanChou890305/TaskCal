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

struct TaskCalWidget: Widget {
  let kind: String = "TaskCalWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: TaskCalWidgetProvider()) { entry in
      TaskCalWidgetView(entry: entry)
    }
    .configurationDisplayName("Today's Tasks")
    .description("View your today's to-do list on the home screen.")
    .supportedFamilies([.systemSmall, .systemMedium])
    .contentMarginsDisabled()
  }
}

struct TaskCalWidgetProvider: TimelineProvider {
  func placeholder(in context: Context) -> TaskCalWidgetEntry {
    TaskCalWidgetEntry(date: Date(), tasks: [
      WidgetTask(id: "1", title: "Morning stand-up", time: "09:30", completed: true),
      WidgetTask(id: "2", title: "Lunch with Mei",   time: "12:00", completed: false),
      WidgetTask(id: "3", title: "Draft Q2 plan",    time: "14:00", completed: false),
    ])
  }

  func getSnapshot(in context: Context, completion: @escaping (TaskCalWidgetEntry) -> Void) {
    completion(TaskCalWidgetEntry(date: Date(), tasks: loadTodayTasks()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<TaskCalWidgetEntry>) -> Void) {
    let tasks   = loadTodayTasks()
    let entry   = TaskCalWidgetEntry(date: Date(), tasks: tasks)
    let cal     = Calendar.current
    let tmrw    = cal.startOfDay(for: Date().addingTimeInterval(86400))
    let midnight = cal.date(byAdding: .minute, value: 1, to: tmrw) ?? tmrw
    let nextHour = cal.date(byAdding: .hour, value: 1, to: Date()) ?? Date()
    completion(Timeline(entries: [entry], policy: .after(min(midnight, nextHour))))
  }

  private func loadTodayTasks() -> [WidgetTask] {
    guard let store = UserDefaults(suiteName: appGroupId),
          let json  = store.string(forKey: widgetDataKey),
          let data  = json.data(using: .utf8) else { return [] }
    let fmt = DateFormatter(); fmt.dateFormat = "yyyy-MM-dd"
    let key = fmt.string(from: Date())
    guard let dict = try? JSONDecoder().decode([String: [WidgetTask]].self, from: data),
          let day  = dict[key] else { return [] }
    return day
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

// ── Task row ──────────────────────────────────────────────────────────────────
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
      // Checkbox — filled accent when completed, outlined when pending
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

      // Title — strikethrough + muted when done
      Text(task.title)
        .font(.system(size: 10, weight: .medium))
        .foregroundColor(task.completed ? fg3 : fg)
        .strikethrough(task.completed)
        .lineLimit(1)
        .truncationMode(.tail)

      Spacer(minLength: 0)

      // Time — plain monospaced, accent color
      if !task.formattedTime.isEmpty {
        Text(task.formattedTime)
          .font(.system(size: 9, weight: .medium, design: .monospaced))
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

  var body: some View {
    let isDark    = colorScheme == .dark
    let bg        = isDark ? palPaperDk  : palPaper
    let fg        = isDark ? palInkDk    : palInk
    let fg3       = isDark ? palInk3Dk   : palInk3
    let acc       = isDark ? palAccentDk : palAccent
    let div       = fg.opacity(isDark ? 0.08 : 0.12)
    let sorted    = entry.tasks.sorted { !$0.completed && $1.completed }
    let maxVis    = family == .systemSmall ? 3 : 6
    let visible   = Array(sorted.prefix(maxVis))
    let todoCount = entry.tasks.filter { !$0.completed }.count
    let doneCount = entry.tasks.filter { $0.completed }.count
    let total     = entry.tasks.count
    let dayNum    = Calendar.current.component(.day, from: entry.date)
    let kicker    = kickerString(from: entry.date)

    if #available(iOS 17.0, *) {
      layoutView(
        isDark: isDark, fg: fg, fg3: fg3, acc: acc, div: div,
        visible: visible, todoCount: todoCount, doneCount: doneCount,
        total: total, dayNum: dayNum, kicker: kicker
      )
      .containerBackground(bg, for: .widget)
    } else {
      layoutView(
        isDark: isDark, fg: fg, fg3: fg3, acc: acc, div: div,
        visible: visible, todoCount: todoCount, doneCount: doneCount,
        total: total, dayNum: dayNum, kicker: kicker
      )
      .background(bg)
    }
  }

  @ViewBuilder
  private func layoutView(
    isDark: Bool, fg: Color, fg3: Color, acc: Color, div: Color,
    visible: [WidgetTask], todoCount: Int, doneCount: Int,
    total: Int, dayNum: Int, kicker: String
  ) -> some View {
    if family == .systemMedium {
      mediumLayout(
        isDark: isDark, fg: fg, fg3: fg3, acc: acc, div: div,
        visible: visible, doneCount: doneCount, total: total,
        dayNum: dayNum, kicker: kicker
      )
    } else {
      smallLayout(
        isDark: isDark, fg: fg, fg3: fg3, acc: acc, div: div,
        visible: visible, todoCount: todoCount, dayNum: dayNum, kicker: kicker
      )
    }
  }

  // ── Small layout ─────────────────────────────────────────────────────────
  @ViewBuilder
  private func smallLayout(
    isDark: Bool, fg: Color, fg3: Color, acc: Color, div: Color,
    visible: [WidgetTask], todoCount: Int, dayNum: Int, kicker: String
  ) -> some View {
    VStack(alignment: .leading, spacing: 0) {
      // Header — badge top-right, aligned with kicker row
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

      // Divider
      Rectangle()
        .fill(div)
        .frame(height: 1)
        .padding(.bottom, 8)

      // Task list
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
      // Left column
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

      // Vertical divider
      Rectangle()
        .fill(div)
        .frame(width: 1)

      // Right column — task list
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
}

struct TaskCalWidget_Previews: PreviewProvider {
  static var previews: some View {
    let tasks = [
      WidgetTask(id: "1", title: "Morning stand-up", time: "09:30", completed: true),
      WidgetTask(id: "2", title: "Design tokens",    time: "10:30", completed: true),
      WidgetTask(id: "3", title: "Lunch w/ Mei",     time: "12:00", completed: false),
      WidgetTask(id: "4", title: "Draft Q2 plan",    time: "14:00", completed: false),
    ]
    Group {
      TaskCalWidgetView(entry: TaskCalWidgetEntry(date: Date(), tasks: tasks))
        .previewContext(WidgetPreviewContext(family: .systemSmall))

      TaskCalWidgetView(entry: TaskCalWidgetEntry(date: Date(), tasks: tasks))
        .previewContext(WidgetPreviewContext(family: .systemMedium))
    }
  }
}
