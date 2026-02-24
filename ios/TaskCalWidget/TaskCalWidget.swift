import WidgetKit
import SwiftUI
import UIKit

private let appGroupId = "group.com.cty0305.too.doo.list.data"
private let widgetDataKey = "widgetTasksByDate"

// App primary color (#6c63ff)
private let primaryColor = Color(red: 108/255, green: 99/255, blue: 1.0)

struct TaskCalWidgetEntry: TimelineEntry {
  let date: Date
  let tasks: [WidgetTask]
}

struct WidgetTask: Codable {
  let id: String
  let title: String
  let time: String
  let completed: Bool

  // Format time to hh:mm only (remove seconds if present)
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
    let nextUpdate = Calendar.current.date(byAdding: .hour, value: 1, to: Date()) ?? Date()
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

struct TaskCalWidgetView: View {
  @Environment(\.widgetFamily) var family
  var entry: TaskCalWidgetEntry

  var body: some View {
    let (pending, completed) = entry.tasks.splitByCompleted()
    let content = VStack(alignment: .leading, spacing: 6) {
      Text("Today")
        .font(.headline)
        .foregroundColor(.primary)
        .padding(.bottom, 4)
      if entry.tasks.isEmpty {
        HStack(alignment: .center, spacing: 6) {
          Image(systemName: "checkmark.circle.fill")
            .font(.caption)
            .foregroundColor(primaryColor)
          Text("All done for today!")
            .font(.caption)
            .foregroundColor(.secondary)
        }
      } else {
        ForEach(Array(pending.prefix(family == .systemSmall ? 3 : 6)), id: \.id) { task in
          HStack(alignment: .center, spacing: 6) {
            Image(systemName: "square")
              .font(.caption)
              .foregroundColor(.secondary)
            Text(task.title)
              .font(.caption)
              .lineLimit(1)
              .truncationMode(.tail)
            Spacer(minLength: 0)
            if !task.formattedTime.isEmpty {
              Text(task.formattedTime)
                .font(.caption2)
                .foregroundColor(primaryColor)
            }
          }
        }
        if family == .systemMedium && !completed.isEmpty {
          Text("\(completed.count) done")
            .font(.caption2)
            .foregroundColor(.secondary)
        }
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .padding(.horizontal, 12)
    .padding(.top, 8)
    .padding(.bottom, 8)

    if #available(iOS 17.0, *) {
      content
        .containerBackground(for: .widget) {
          Color(UIColor.systemBackground)
        }
    } else {
      content
        .background(Color(UIColor.systemBackground))
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
