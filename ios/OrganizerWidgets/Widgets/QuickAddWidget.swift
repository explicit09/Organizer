import WidgetKit
import SwiftUI
import AppIntents

// MARK: - App Intents for Interactive Actions

@available(iOS 17.0, *)
struct OpenAppIntent: AppIntent {
    static var title: LocalizedStringResource = "Open Organizer"
    static var description = IntentDescription("Opens the Organizer app")
    static var openAppWhenRun: Bool = true

    func perform() async throws -> some IntentResult {
        return .result()
    }
}

@available(iOS 17.0, *)
struct QuickAddTaskIntent: AppIntent {
    static var title: LocalizedStringResource = "Quick Add Task"
    static var description = IntentDescription("Opens the app to add a new task")
    static var openAppWhenRun: Bool = true

    func perform() async throws -> some IntentResult {
        // This will open the app with a deep link to create task
        return .result()
    }
}

@available(iOS 17.0, *)
struct QuickAddNoteIntent: AppIntent {
    static var title: LocalizedStringResource = "Quick Add Note"
    static var description = IntentDescription("Opens the app to add a new note")
    static var openAppWhenRun: Bool = true

    func perform() async throws -> some IntentResult {
        return .result()
    }
}

@available(iOS 17.0, *)
struct CompleteTaskIntent: AppIntent {
    static var title: LocalizedStringResource = "Complete Task"
    static var description = IntentDescription("Marks a task as complete")

    @Parameter(title: "Task ID")
    var taskId: String

    init() {
        self.taskId = ""
    }

    init(taskId: String) {
        self.taskId = taskId
    }

    func perform() async throws -> some IntentResult {
        // In production, this would call your API to complete the task
        // For now, just refresh the widget
        WidgetDataService.refreshAllWidgets()
        return .result()
    }
}

// MARK: - Quick Add Entry

@available(iOS 17.0, *)
struct QuickAddEntry: TimelineEntry {
    let date: Date
    let topTasks: [WidgetTask]

    static let placeholder = QuickAddEntry(
        date: Date(),
        topTasks: [
            WidgetTask(id: "1", title: "High priority task", priority: "urgent", status: "not_started", dueAt: Date(), type: "task"),
            WidgetTask(id: "2", title: "Review documents", priority: "high", status: "not_started", dueAt: Date(), type: "task"),
        ]
    )
}

// MARK: - Timeline Provider

@available(iOS 17.0, *)
struct QuickAddProvider: TimelineProvider {
    typealias Entry = QuickAddEntry

    func placeholder(in context: Context) -> QuickAddEntry {
        .placeholder
    }

    func getSnapshot(in context: Context, completion: @escaping (QuickAddEntry) -> Void) {
        Task {
            let tasks = await WidgetDataService.shared.getTodayTasks()
            let entry = QuickAddEntry(date: Date(), topTasks: Array(tasks.prefix(2)))
            completion(entry)
        }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<QuickAddEntry>) -> Void) {
        Task {
            let tasks = await WidgetDataService.shared.getTodayTasks()
            let entry = QuickAddEntry(date: Date(), topTasks: Array(tasks.prefix(2)))

            let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
            let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
            completion(timeline)
        }
    }
}

// MARK: - Widget View

@available(iOS 17.0, *)
struct QuickAddWidgetEntryView: View {
    var entry: QuickAddEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemSmall:
            SmallQuickAddView(entry: entry)
        case .systemMedium:
            MediumQuickAddView(entry: entry)
        default:
            SmallQuickAddView(entry: entry)
        }
    }
}

// MARK: - Small Widget

@available(iOS 17.0, *)
struct SmallQuickAddView: View {
    let entry: QuickAddEntry

    var body: some View {
        VStack(spacing: 12) {
            HStack {
                Image(systemName: "plus.circle.fill")
                    .foregroundStyle(.blue)
                Text("Quick Add")
                    .font(.headline)
                Spacer()
            }

            Spacer()

            VStack(spacing: 10) {
                Button(intent: QuickAddTaskIntent()) {
                    HStack {
                        Image(systemName: "checkmark.square")
                        Text("Task")
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(.blue.opacity(0.15))
                    .foregroundStyle(.blue)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                .buttonStyle(.plain)

                Button(intent: QuickAddNoteIntent()) {
                    HStack {
                        Image(systemName: "note.text")
                        Text("Note")
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(.orange.opacity(0.15))
                    .foregroundStyle(.orange)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                .buttonStyle(.plain)
            }
            .font(.subheadline)
        }
        .padding()
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

// MARK: - Medium Widget

@available(iOS 17.0, *)
struct MediumQuickAddView: View {
    let entry: QuickAddEntry

    var body: some View {
        HStack(spacing: 16) {
            // Left side - Quick actions
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Image(systemName: "bolt.fill")
                        .foregroundStyle(.yellow)
                    Text("Quick Actions")
                        .font(.headline)
                }

                HStack(spacing: 10) {
                    Button(intent: QuickAddTaskIntent()) {
                        VStack(spacing: 6) {
                            Image(systemName: "checkmark.square.fill")
                                .font(.title2)
                            Text("Task")
                                .font(.caption)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(.blue.opacity(0.15))
                        .foregroundStyle(.blue)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                    }
                    .buttonStyle(.plain)

                    Button(intent: QuickAddNoteIntent()) {
                        VStack(spacing: 6) {
                            Image(systemName: "note.text.badge.plus")
                                .font(.title2)
                            Text("Note")
                                .font(.caption)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(.orange.opacity(0.15))
                        .foregroundStyle(.orange)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                    }
                    .buttonStyle(.plain)
                }

                Spacer()
            }

            Divider()

            // Right side - Top priority tasks with complete buttons
            VStack(alignment: .leading, spacing: 8) {
                Text("Top Priority")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(.secondary)

                if entry.topTasks.isEmpty {
                    VStack {
                        Image(systemName: "checkmark.circle")
                            .font(.title)
                            .foregroundStyle(.green)
                        Text("All clear!")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    ForEach(entry.topTasks) { task in
                        HStack {
                            Button(intent: CompleteTaskIntent(taskId: task.id)) {
                                Image(systemName: "circle")
                                    .foregroundStyle(.secondary)
                            }
                            .buttonStyle(.plain)

                            Text(task.title)
                                .font(.caption)
                                .lineLimit(1)

                            Spacer()
                        }
                        .padding(.vertical, 4)
                    }
                }

                Spacer()
            }
            .frame(maxWidth: .infinity)
        }
        .padding()
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

// MARK: - Widget Definition

@available(iOS 17.0, *)
struct QuickAddWidget: Widget {
    let kind: String = "QuickAddWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(
            kind: kind,
            provider: QuickAddProvider()
        ) { entry in
            QuickAddWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Quick Add")
        .description("Quickly add tasks and notes, and complete top priority items.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// MARK: - Previews

@available(iOS 17.0, *)
#Preview("Small", as: .systemSmall) {
    QuickAddWidget()
} timeline: {
    QuickAddEntry.placeholder
}

@available(iOS 17.0, *)
#Preview("Medium", as: .systemMedium) {
    QuickAddWidget()
} timeline: {
    QuickAddEntry.placeholder
}
