import WidgetKit
import SwiftUI

// MARK: - Timeline Provider

struct UpcomingProvider: AppIntentTimelineProvider {
    typealias Entry = UpcomingEntry
    typealias Intent = ConfigurationAppIntent

    func placeholder(in context: Context) -> UpcomingEntry {
        .placeholder
    }

    func snapshot(for configuration: ConfigurationAppIntent, in context: Context) async -> UpcomingEntry {
        await fetchEntry(for: configuration)
    }

    func timeline(for configuration: ConfigurationAppIntent, in context: Context) async -> Timeline<UpcomingEntry> {
        let entry = await fetchEntry(for: configuration)

        // Refresh every hour
        let nextUpdate = Calendar.current.date(byAdding: .hour, value: 1, to: Date())!
        return Timeline(entries: [entry], policy: .after(nextUpdate))
    }

    private func fetchEntry(for configuration: ConfigurationAppIntent) async -> UpcomingEntry {
        let tasks = await WidgetDataService.shared.getUpcomingTasks(limit: 10)
        return UpcomingEntry(date: Date(), tasks: tasks, configuration: configuration)
    }
}

// MARK: - Widget Views

struct UpcomingWidgetEntryView: View {
    var entry: UpcomingEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemMedium:
            MediumUpcomingView(entry: entry)
        case .systemLarge:
            LargeUpcomingView(entry: entry)
        default:
            MediumUpcomingView(entry: entry)
        }
    }
}

// MARK: - Medium Widget

struct MediumUpcomingView: View {
    let entry: UpcomingEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "clock.arrow.circlepath")
                    .foregroundStyle(.purple)
                Text("Upcoming")
                    .font(.headline)
                Spacer()
            }

            if entry.tasks.isEmpty {
                HStack {
                    Spacer()
                    VStack(spacing: 8) {
                        Image(systemName: "calendar.badge.checkmark")
                            .font(.largeTitle)
                            .foregroundStyle(.green)
                        Text("Nothing scheduled")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                }
                .padding(.vertical)
            } else {
                ForEach(entry.tasks.prefix(3)) { task in
                    UpcomingRowView(task: task)
                }
            }

            Spacer()
        }
        .padding()
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

// MARK: - Large Widget

struct LargeUpcomingView: View {
    let entry: UpcomingEntry

    private var groupedTasks: [(String, [WidgetTask])] {
        let grouped = Dictionary(grouping: entry.tasks) { task -> String in
            guard let dueAt = task.dueAt else { return "No Date" }
            if Calendar.current.isDateInToday(dueAt) {
                return "Today"
            } else if Calendar.current.isDateInTomorrow(dueAt) {
                return "Tomorrow"
            } else {
                return dueAt.formatted(date: .abbreviated, time: .omitted)
            }
        }

        let order = ["Today", "Tomorrow"]
        var result: [(String, [WidgetTask])] = []

        for key in order {
            if let tasks = grouped[key] {
                result.append((key, tasks))
            }
        }

        for (key, tasks) in grouped where !order.contains(key) {
            result.append((key, tasks.sorted { ($0.dueAt ?? .distantFuture) < ($1.dueAt ?? .distantFuture) }))
        }

        return result
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading) {
                    Text("Upcoming")
                        .font(.title2)
                        .fontWeight(.bold)
                    Text("\(entry.tasks.count) items this week")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Image(systemName: "clock.arrow.circlepath")
                    .font(.title2)
                    .foregroundStyle(.purple)
            }

            Divider()

            if entry.tasks.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "calendar.badge.checkmark")
                        .font(.system(size: 48))
                        .foregroundStyle(.green)
                    Text("Nothing upcoming!")
                        .font(.headline)
                    Text("Your schedule is clear")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 12) {
                        ForEach(groupedTasks.prefix(3), id: \.0) { section, tasks in
                            VStack(alignment: .leading, spacing: 6) {
                                Text(section)
                                    .font(.caption)
                                    .fontWeight(.semibold)
                                    .foregroundStyle(.secondary)

                                ForEach(tasks.prefix(3)) { task in
                                    UpcomingRowView(task: task, showDate: false)
                                }
                            }
                        }
                    }
                }
            }
        }
        .padding()
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

// MARK: - Upcoming Row Component

struct UpcomingRowView: View {
    let task: WidgetTask
    var showDate: Bool = true

    var body: some View {
        HStack(spacing: 10) {
            RoundedRectangle(cornerRadius: 2)
                .fill(priorityColor)
                .frame(width: 4)

            VStack(alignment: .leading, spacing: 2) {
                Text(task.title)
                    .font(.subheadline)
                    .lineLimit(1)

                if showDate, let dueAt = task.dueAt {
                    Text(relativeDate(dueAt))
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()

            Image(systemName: typeIcon)
                .font(.caption)
                .foregroundStyle(.secondary)
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

    private var typeIcon: String {
        switch task.type {
        case "meeting": return "person.2"
        case "school": return "book"
        default: return "checkmark.square"
        }
    }

    private func relativeDate(_ date: Date) -> String {
        let calendar = Calendar.current
        if calendar.isDateInToday(date) {
            return "Today, \(date.formatted(date: .omitted, time: .shortened))"
        } else if calendar.isDateInTomorrow(date) {
            return "Tomorrow"
        } else {
            return date.formatted(date: .abbreviated, time: .omitted)
        }
    }
}

// MARK: - Widget Definition

struct UpcomingWidget: Widget {
    let kind: String = "UpcomingWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(
            kind: kind,
            intent: ConfigurationAppIntent.self,
            provider: UpcomingProvider()
        ) { entry in
            UpcomingWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Upcoming")
        .description("See what's coming up this week.")
        .supportedFamilies([.systemMedium, .systemLarge])
    }
}

// MARK: - Previews

#Preview("Medium", as: .systemMedium) {
    UpcomingWidget()
} timeline: {
    UpcomingEntry.placeholder
}

#Preview("Large", as: .systemLarge) {
    UpcomingWidget()
} timeline: {
    UpcomingEntry.placeholder
}
