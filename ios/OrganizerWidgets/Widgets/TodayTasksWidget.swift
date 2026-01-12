import WidgetKit
import SwiftUI

// MARK: - Timeline Provider

struct TodayTasksProvider: AppIntentTimelineProvider {
    typealias Entry = TodayTasksEntry
    typealias Intent = ConfigurationAppIntent

    func placeholder(in context: Context) -> TodayTasksEntry {
        .placeholder
    }

    func snapshot(for configuration: ConfigurationAppIntent, in context: Context) async -> TodayTasksEntry {
        await fetchEntry(for: configuration)
    }

    func timeline(for configuration: ConfigurationAppIntent, in context: Context) async -> Timeline<TodayTasksEntry> {
        let entry = await fetchEntry(for: configuration)

        // Refresh every 30 minutes
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
        return Timeline(entries: [entry], policy: .after(nextUpdate))
    }

    private func fetchEntry(for configuration: ConfigurationAppIntent) async -> TodayTasksEntry {
        let tasks = await WidgetDataService.shared.getTodayTasks()
        return TodayTasksEntry(date: Date(), tasks: tasks, configuration: configuration)
    }
}

// MARK: - Widget Views

struct TodayTasksWidgetEntryView: View {
    var entry: TodayTasksEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemSmall:
            SmallTodayView(entry: entry)
        case .systemMedium:
            MediumTodayView(entry: entry)
        case .systemLarge:
            LargeTodayView(entry: entry)
        default:
            SmallTodayView(entry: entry)
        }
    }
}

// MARK: - Small Widget

struct SmallTodayView: View {
    let entry: TodayTasksEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "calendar")
                    .foregroundStyle(.blue)
                Text("Today")
                    .font(.headline)
                Spacer()
            }

            if entry.tasks.isEmpty {
                Spacer()
                VStack {
                    Image(systemName: "checkmark.circle")
                        .font(.title)
                        .foregroundStyle(.green)
                    Text("All done!")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity)
                Spacer()
            } else {
                Text("\(entry.tasks.count)")
                    .font(.system(size: 44, weight: .bold))
                    .foregroundStyle(.primary)

                Text(entry.tasks.count == 1 ? "task" : "tasks")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                Spacer()

                if let first = entry.tasks.first {
                    HStack {
                        Circle()
                            .fill(priorityColor(first.priority))
                            .frame(width: 6, height: 6)
                        Text(first.title)
                            .font(.caption)
                            .lineLimit(1)
                    }
                }
            }
        }
        .padding()
        .containerBackground(.fill.tertiary, for: .widget)
    }

    private func priorityColor(_ priority: String) -> Color {
        switch priority {
        case "urgent": return .red
        case "high": return .orange
        case "medium": return .blue
        default: return .gray
        }
    }
}

// MARK: - Medium Widget

struct MediumTodayView: View {
    let entry: TodayTasksEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "calendar")
                    .foregroundStyle(.blue)
                Text("Today's Tasks")
                    .font(.headline)
                Spacer()
                Text("\(entry.tasks.count)")
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundStyle(.blue)
            }

            if entry.tasks.isEmpty {
                HStack {
                    Spacer()
                    VStack(spacing: 8) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.largeTitle)
                            .foregroundStyle(.green)
                        Text("You're all caught up!")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                }
                .padding(.vertical)
            } else {
                ForEach(entry.tasks.prefix(3)) { task in
                    TaskRowView(task: task)
                }
            }

            Spacer()
        }
        .padding()
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

// MARK: - Large Widget

struct LargeTodayView: View {
    let entry: TodayTasksEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading) {
                    Text("Today")
                        .font(.title2)
                        .fontWeight(.bold)
                    Text(Date().formatted(date: .complete, time: .omitted))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                VStack(alignment: .trailing) {
                    Text("\(entry.tasks.count)")
                        .font(.title)
                        .fontWeight(.bold)
                        .foregroundStyle(.blue)
                    Text("tasks")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Divider()

            if entry.tasks.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 48))
                        .foregroundStyle(.green)
                    Text("No tasks for today!")
                        .font(.headline)
                    Text("Enjoy your free time")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    VStack(spacing: 8) {
                        ForEach(entry.tasks.prefix(6)) { task in
                            TaskRowView(task: task, showTime: true)
                        }

                        if entry.tasks.count > 6 {
                            Text("+\(entry.tasks.count - 6) more")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .frame(maxWidth: .infinity, alignment: .center)
                                .padding(.top, 4)
                        }
                    }
                }
            }
        }
        .padding()
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

// MARK: - Task Row Component

struct TaskRowView: View {
    let task: WidgetTask
    var showTime: Bool = false

    var body: some View {
        HStack(spacing: 10) {
            Circle()
                .fill(priorityColor)
                .frame(width: 8, height: 8)

            VStack(alignment: .leading, spacing: 2) {
                Text(task.title)
                    .font(.subheadline)
                    .lineLimit(1)

                if showTime, let dueAt = task.dueAt {
                    Text(dueAt.formatted(date: .omitted, time: .shortened))
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()

            if task.isOverdue {
                Image(systemName: "exclamationmark.circle.fill")
                    .foregroundStyle(.red)
                    .font(.caption)
            }
        }
        .padding(.vertical, 4)
    }

    private var priorityColor: Color {
        switch task.priority {
        case "urgent": return .red
        case "high": return .orange
        case "medium": return .blue
        default: return .gray
        }
    }
}

// MARK: - Widget Definition

struct TodayTasksWidget: Widget {
    let kind: String = "TodayTasksWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(
            kind: kind,
            intent: ConfigurationAppIntent.self,
            provider: TodayTasksProvider()
        ) { entry in
            TodayTasksWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Today's Tasks")
        .description("See your tasks for today at a glance.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

// MARK: - Previews

#Preview("Small", as: .systemSmall) {
    TodayTasksWidget()
} timeline: {
    TodayTasksEntry.placeholder
}

#Preview("Medium", as: .systemMedium) {
    TodayTasksWidget()
} timeline: {
    TodayTasksEntry.placeholder
}

#Preview("Large", as: .systemLarge) {
    TodayTasksWidget()
} timeline: {
    TodayTasksEntry.placeholder
}
