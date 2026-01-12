import WidgetKit
import SwiftUI

// MARK: - Lock Screen Widget Views

struct LockScreenTodayView: View {
    let entry: TodayTasksEntry

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: "checklist")
            Text("\(entry.tasks.count)")
                .fontWeight(.semibold)
        }
    }
}

struct LockScreenUpcomingView: View {
    let entry: UpcomingEntry

    var body: some View {
        if let next = entry.tasks.first {
            VStack(alignment: .leading, spacing: 2) {
                Text(next.title)
                    .font(.caption2)
                    .lineLimit(1)
                if let dueAt = next.dueAt {
                    Text(dueAt.formatted(date: .omitted, time: .shortened))
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }
        } else {
            Text("No upcoming")
                .font(.caption2)
        }
    }
}

struct LockScreenStatsView: View {
    let entry: StatsEntry

    var body: some View {
        HStack(spacing: 8) {
            Label("\(entry.stats.dueToday)", systemImage: "calendar")
            if entry.stats.overdue > 0 {
                Label("\(entry.stats.overdue)", systemImage: "exclamationmark.triangle")
                    .foregroundStyle(.red)
            }
        }
        .font(.caption2)
    }
}

// MARK: - Circular Lock Screen Widget

struct CircularTodayView: View {
    let entry: TodayTasksEntry

    var body: some View {
        ZStack {
            AccessoryWidgetBackground()

            VStack(spacing: 0) {
                Text("\(entry.tasks.count)")
                    .font(.title2)
                    .fontWeight(.bold)
                Text("tasks")
                    .font(.caption2)
            }
        }
    }
}

struct CircularProgressView: View {
    let entry: StatsEntry

    private var progress: Double {
        let total = entry.stats.dueToday + entry.stats.completedToday
        guard total > 0 else { return 0 }
        return Double(entry.stats.completedToday) / Double(total)
    }

    var body: some View {
        Gauge(value: progress) {
            Image(systemName: "checkmark")
        }
        .gaugeStyle(.accessoryCircularCapacity)
    }
}

// MARK: - Lock Screen Widget Definitions

struct LockScreenTodayWidget: Widget {
    let kind: String = "LockScreenTodayWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(
            kind: kind,
            intent: ConfigurationAppIntent.self,
            provider: TodayTasksProvider()
        ) { entry in
            LockScreenTodayView(entry: entry)
        }
        .configurationDisplayName("Today Count")
        .description("Shows number of tasks due today.")
        .supportedFamilies([.accessoryInline])
    }
}

struct LockScreenCircularWidget: Widget {
    let kind: String = "LockScreenCircularWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(
            kind: kind,
            intent: ConfigurationAppIntent.self,
            provider: TodayTasksProvider()
        ) { entry in
            CircularTodayView(entry: entry)
        }
        .configurationDisplayName("Tasks Today")
        .description("Shows today's task count in a circle.")
        .supportedFamilies([.accessoryCircular])
    }
}

struct LockScreenProgressWidget: Widget {
    let kind: String = "LockScreenProgressWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(
            kind: kind,
            intent: ConfigurationAppIntent.self,
            provider: StatsProvider()
        ) { entry in
            CircularProgressView(entry: entry)
        }
        .configurationDisplayName("Today's Progress")
        .description("Shows completion progress for today.")
        .supportedFamilies([.accessoryCircular])
    }
}

struct LockScreenRectangularWidget: Widget {
    let kind: String = "LockScreenRectangularWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(
            kind: kind,
            intent: ConfigurationAppIntent.self,
            provider: UpcomingProvider()
        ) { entry in
            LockScreenUpcomingView(entry: entry)
        }
        .configurationDisplayName("Next Up")
        .description("Shows your next upcoming item.")
        .supportedFamilies([.accessoryRectangular])
    }
}

// MARK: - Previews

#Preview("Inline", as: .accessoryInline) {
    LockScreenTodayWidget()
} timeline: {
    TodayTasksEntry.placeholder
}

#Preview("Circular", as: .accessoryCircular) {
    LockScreenCircularWidget()
} timeline: {
    TodayTasksEntry.placeholder
}

#Preview("Progress", as: .accessoryCircular) {
    LockScreenProgressWidget()
} timeline: {
    StatsEntry.placeholder
}

#Preview("Rectangular", as: .accessoryRectangular) {
    LockScreenRectangularWidget()
} timeline: {
    UpcomingEntry.placeholder
}
