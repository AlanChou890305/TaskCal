import WidgetKit
import SwiftUI

private let appGroupId = "group.com.cty0305.too.doo.list.data"
private let widgetDataKey = "widgetTasksByDate"

// Indigo accent (#3B4B7A) and paper (#F2F1EB)
private let accentColor  = Color(red: 59/255,  green: 75/255,  blue: 122/255)
private let paperColor   = Color(red: 242/255, green: 241/255, blue: 235/255)
private let inkColor     = Color(red: 26/255,  green: 31/255,  blue: 46/255)
private let ink2Color    = Color(red: 69/255,  green: 76/255,  blue: 102/255)
private let ink3Color    = Color(red: 142/255, green: 148/255, blue: 170/255)
private let accentTint   = Color(red: 214/255, green: 215/255, blue: 232/255)

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
    let components = time.split(separator: ":")
    if components.count >= 2 {
      return "\(components[0]):\(components[1])"
    }
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
  }
}

struct TaskCalWidgetProvider: TimelineProvider {
  func placeholder(in context: Context) -> TaskCalWidgetEntry {
    TaskCalWidgetEntry(date: Date(), tasks: [])
  }

  func getSnapshot(in context: Context, completion: @escaping (TaskCalWidgetEntry) -> Void) {
    let entry = TaskCalWidgetEntry(date: Date(), tasks: loadTodayTasks())
    completion(entry)
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<TaskCalWidgetEntry>) -> Void) {
    let tasks = loadTodayTasks()
    let entry = TaskCalWidgetEntry(date: Date(), tasks: tasks)
    let calendar = Calendar.current
    let tomorrow = calendar.startOfDay(for: Date().addingTimeInterval(86400))
    let nextMidnight = calendar.date(byAdding: .minute, value: 1, to: tomorrow) ?? tomorrow
    let nextHour = calendar.date(byAdding: .hour, value: 1, to: Date()) ?? Date()
    let nextUpdate = min(nextMidnight, nextHour)
    let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
    completion(timeline)
  }

  private func loadTodayTasks() -> [WidgetTask] {
    guard let store = UserDefaults(suiteName: appGroupId),
          let json = store.string(forKey: widgetDataKey),
          let data = json.data(using: .utf8) else { return [] }
    let formatter = DateFormatter()
    formatter.dateFormat = "yyyy-MM-dd"
    let todayKey = formatter.string(from: Date())
    guard let dict = try? JSONDecoder().decode([String: [WidgetTask]].self, from: data),
          let dayTasks = dict[todayKey] else { return [] }
    return dayTasks
  }
}

// Kicker string: "WED · APR 23"
private func kickerString(from date: Date) -> String {
  let cal = Calendar.current
  let formatter = DateFormatter()
  formatter.locale = Locale(identifier: "en_US")
  let weekday = formatter.shortWeekdaySymbols[cal.component(.weekday, from: date) - 1].uppercased()
  let month   = formatter.shortMonthSymbols[cal.component(.month,   from: date) - 1].uppercased()
  let day     = cal.component(.day, from: date)
  return "\(weekday) · \(month) \(day)"
}

struct TaskRowView: View {
  let task: WidgetTask

  var body: some View {
    HStack(alignment: .center, spacing: 6) {
      RoundedRectangle(cornerRadius: 2)
        .stroke(ink3Color, lineWidth: 1.4)
        .frame(width: 12, height: 12)
      Text(task.title)
        .font(.system(size: 12, weight: .regular))
        .foregroundColor(ink2Color)
        .lineLimit(1)
        .truncationMode(.tail)
      Spacer(minLength: 0)
      if !task.formattedTime.isEmpty {
        Text(task.formattedTime)
          .font(.system(size: 10, weight: .medium, design: .monospaced))
          .foregroundColor(accentColor)
          .padding(.horizontal, 5)
          .padding(.vertical, 2)
          .background(accentTint)
          .cornerRadius(4)
      }
    }
  }
}

struct TaskCalWidgetView: View {
  @Environment(\.widgetFamily) var family
  var entry: TaskCalWidgetEntry

  var body: some View {
    let (pending, completed) = entry.tasks.splitByCompleted()
    let maxVisible = family == .systemSmall ? 3 : 6
    let content = VStack(alignment: .leading, spacing: 0) {
      // Mono kicker header
      Text(kickerString(from: entry.date))
        .font(.system(size: 9, weight: .medium, design: .monospaced))
        .foregroundColor(ink3Color)
        .kerning(1.2)
        .padding(.bottom, 6)

      // Hairline divider
      Rectangle()
        .fill(inkColor.opacity(0.12))
        .frame(height: 1)
        .padding(.bottom, 8)

      if pending.isEmpty && completed.isEmpty {
        HStack(alignment: .center, spacing: 6) {
          Image(systemName: "checkmark.circle.fill")
            .font(.system(size: 11))
            .foregroundColor(accentColor)
          Text("All clear")
            .font(.system(size: 11, weight: .regular))
            .foregroundColor(ink3Color)
        }
      } else if pending.isEmpty {
        HStack(alignment: .center, spacing: 6) {
          Image(systemName: "checkmark.circle.fill")
            .font(.system(size: 11))
            .foregroundColor(accentColor)
          Text("All done · \(completed.count) tasks")
            .font(.system(size: 11, weight: .regular))
            .foregroundColor(ink3Color)
        }
      } else {
        VStack(alignment: .leading, spacing: 7) {
          ForEach(Array(pending.prefix(maxVisible)), id: \.id) { task in
            TaskRowView(task: task)
          }
        }
        if family == .systemMedium && !completed.isEmpty {
          Spacer(minLength: 0)
          HStack(spacing: 4) {
            Image(systemName: "checkmark.circle.fill")
              .font(.system(size: 9))
              .foregroundColor(ink3Color)
            Text("\(completed.count) completed")
              .font(.system(size: 9, weight: .regular, design: .monospaced))
              .foregroundColor(ink3Color)
          }
          .padding(.top, 6)
        }
      }

      Spacer(minLength: 0)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .padding(.horizontal, 14)
    .padding(.top, 12)
    .padding(.bottom, 10)

    if #available(iOS 17.0, *) {
      content
        .containerBackground(paperColor, for: .widget)
    } else {
      content
        .background(paperColor)
    }
  }
}

extension Array where Element == WidgetTask {
  func splitByCompleted() -> (pending: [WidgetTask], completed: [WidgetTask]) {
    let p = filter { !$0.completed }
    let c = filter { $0.completed }
    return (p, c)
  }
}

struct TaskCalWidget_Previews: PreviewProvider {
  static var previews: some View {
    Group {
      TaskCalWidgetView(entry: TaskCalWidgetEntry(date: Date(), tasks: [
        WidgetTask(id: "1", title: "Buy groceries", time: "09:00", completed: false),
        WidgetTask(id: "2", title: "Call mom", time: "14:00", completed: false),
      ]))
      .previewContext(WidgetPreviewContext(family: .systemSmall))

      TaskCalWidgetView(entry: TaskCalWidgetEntry(date: Date(), tasks: [
        WidgetTask(id: "1", title: "Buy groceries", time: "09:00", completed: false),
        WidgetTask(id: "2", title: "Call mom", time: "14:00", completed: false),
        WidgetTask(id: "3", title: "Finish report", time: "16:00", completed: false),
      ]))
      .previewContext(WidgetPreviewContext(family: .systemMedium))
    }
  }
}
