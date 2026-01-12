import WidgetKit
import SwiftUI

// MARK: - Timeline Provider

struct StatsProvider: AppIntentTimelineProvider {
    typealias Entry = StatsEntry
    typealias Intent = ConfigurationAppIntent

    func placeholder(in context: Context) -> StatsEntry {
        .placeholder
    }

    func snapshot(for configuration: ConfigurationAppIntent, in context: Context) async -> StatsEntry {
        await fetchEntry(for: configuration)
    }

    func timeline(for configuration: ConfigurationAppIntent, in context: Context) async -> Timeline<StatsEntry> {
        let entry = await fetchEntry(for: configuration)

        // Refresh every 30 minutes
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
        return Timeline(entries: [entry], policy: .after(nextUpdate))
    }

    private func fetchEntry(for configuration: ConfigurationAppIntent) async -> StatsEntry {
        let stats = await WidgetDataService.shared.getStats()
        return StatsEntry(date: Date(), stats: stats, configuration: configuration)
    }
}

// MARK: - Widget Views

struct StatsWidgetEntryView: View {
    var entry: StatsEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemSmall:
            SmallStatsView(entry: entry)
        case .systemMedium:
            MediumStatsView(entry: entry)
        default:
            SmallStatsView(entry: entry)
        }
    }
}

// MARK: - Small Widget

struct SmallStatsView: View {
    let entry: StatsEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "chart.bar.fill")
                    .foregroundStyle(.green)
                Text("Stats")
                    .font(.headline)
            }

            Spacer()

            VStack(spacing: 16) {
                HStack {
                    StatCircle(
                        value: entry.stats.dueToday,
                        label: "Today",
                        color: .blue
                    )
                    Spacer()
                    StatCircle(
                        value: entry.stats.completedToday,
                        label: "Done",
                        color: .green
                    )
                }
            }

            Spacer()

            if entry.stats.overdue > 0 {
                HStack {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundStyle(.red)
                        .font(.caption)
                    Text("\(entry.stats.overdue) overdue")
                        .font(.caption)
                        .foregroundStyle(.red)
                }
            }
        }
        .padding()
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

// MARK: - Medium Widget

struct MediumStatsView: View {
    let entry: StatsEntry

    var body: some View {
        HStack(spacing: 16) {
            // Left side - Main stats
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Image(systemName: "chart.bar.fill")
                        .foregroundStyle(.green)
                    Text("Today's Progress")
                        .font(.headline)
                }

                HStack(spacing: 20) {
                    StatBlock(
                        value: entry.stats.dueToday,
                        label: "Due Today",
                        icon: "calendar",
                        color: .blue
                    )

                    StatBlock(
                        value: entry.stats.completedToday,
                        label: "Completed",
                        icon: "checkmark.circle",
                        color: .green
                    )

                    StatBlock(
                        value: entry.stats.inProgress,
                        label: "In Progress",
                        icon: "arrow.triangle.2.circlepath",
                        color: .orange
                    )
                }

                Spacer()
            }

            // Right side - Circular progress
            VStack {
                ZStack {
                    Circle()
                        .stroke(Color.gray.opacity(0.2), lineWidth: 8)

                    Circle()
                        .trim(from: 0, to: progressValue)
                        .stroke(progressColor, style: StrokeStyle(lineWidth: 8, lineCap: .round))
                        .rotationEffect(.degrees(-90))

                    VStack(spacing: 2) {
                        Text("\(Int(progressValue * 100))%")
                            .font(.title3)
                            .fontWeight(.bold)
                        Text("done")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }
                .frame(width: 80, height: 80)
            }
        }
        .padding()
        .containerBackground(.fill.tertiary, for: .widget)
    }

    private var progressValue: Double {
        let total = entry.stats.dueToday + entry.stats.completedToday
        guard total > 0 else { return 0 }
        return Double(entry.stats.completedToday) / Double(total)
    }

    private var progressColor: Color {
        switch progressValue {
        case 0..<0.25: return .red
        case 0.25..<0.5: return .orange
        case 0.5..<0.75: return .yellow
        case 0.75..<1.0: return .blue
        default: return .green
        }
    }
}

// MARK: - Helper Components

struct StatCircle: View {
    let value: Int
    let label: String
    let color: Color

    var body: some View {
        VStack(spacing: 4) {
            ZStack {
                Circle()
                    .fill(color.opacity(0.15))
                    .frame(width: 44, height: 44)

                Text("\(value)")
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundStyle(color)
            }
            Text(label)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
    }
}

struct StatBlock: View {
    let value: Int
    let label: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .foregroundStyle(color)
                .font(.caption)

            Text("\(value)")
                .font(.title2)
                .fontWeight(.bold)

            Text(label)
                .font(.caption2)
                .foregroundStyle(.secondary)
                .lineLimit(1)
        }
    }
}

// MARK: - Widget Definition

struct StatsWidget: Widget {
    let kind: String = "StatsWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(
            kind: kind,
            intent: ConfigurationAppIntent.self,
            provider: StatsProvider()
        ) { entry in
            StatsWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Quick Stats")
        .description("See your productivity at a glance.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// MARK: - Previews

#Preview("Small", as: .systemSmall) {
    StatsWidget()
} timeline: {
    StatsEntry.placeholder
}

#Preview("Medium", as: .systemMedium) {
    StatsWidget()
} timeline: {
    StatsEntry.placeholder
}
