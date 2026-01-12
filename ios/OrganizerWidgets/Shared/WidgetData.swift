import Foundation
import WidgetKit

// MARK: - Widget Data Models

struct WidgetTask: Identifiable, Codable {
    let id: String
    let title: String
    let priority: String
    let status: String
    let dueAt: Date?
    let type: String

    var isCompleted: Bool {
        status == "completed"
    }

    var priorityLevel: Int {
        switch priority {
        case "urgent": return 0
        case "high": return 1
        case "medium": return 2
        case "low": return 3
        default: return 2
        }
    }

    var isOverdue: Bool {
        guard let dueAt = dueAt else { return false }
        return dueAt < Date() && !isCompleted
    }
}

struct WidgetStats: Codable {
    let dueToday: Int
    let inProgress: Int
    let overdue: Int
    let completedToday: Int
    let completedThisWeek: Int
    let totalActive: Int

    static let placeholder = WidgetStats(
        dueToday: 5,
        inProgress: 3,
        overdue: 1,
        completedToday: 2,
        completedThisWeek: 12,
        totalActive: 15
    )
}

// MARK: - Timeline Entries

struct TodayTasksEntry: TimelineEntry {
    let date: Date
    let tasks: [WidgetTask]
    let configuration: ConfigurationAppIntent?

    static let placeholder = TodayTasksEntry(
        date: Date(),
        tasks: [
            WidgetTask(id: "1", title: "Review project proposal", priority: "high", status: "not_started", dueAt: Date(), type: "task"),
            WidgetTask(id: "2", title: "Team standup meeting", priority: "medium", status: "not_started", dueAt: Date().addingTimeInterval(3600), type: "meeting"),
            WidgetTask(id: "3", title: "Submit report", priority: "urgent", status: "in_progress", dueAt: Date().addingTimeInterval(7200), type: "task"),
        ],
        configuration: nil
    )
}

struct UpcomingEntry: TimelineEntry {
    let date: Date
    let tasks: [WidgetTask]
    let configuration: ConfigurationAppIntent?

    static let placeholder = UpcomingEntry(
        date: Date(),
        tasks: [
            WidgetTask(id: "1", title: "Project deadline", priority: "urgent", status: "in_progress", dueAt: Date().addingTimeInterval(86400), type: "task"),
            WidgetTask(id: "2", title: "Client meeting", priority: "high", status: "not_started", dueAt: Date().addingTimeInterval(86400 * 2), type: "meeting"),
            WidgetTask(id: "3", title: "Code review", priority: "medium", status: "not_started", dueAt: Date().addingTimeInterval(86400 * 3), type: "task"),
            WidgetTask(id: "4", title: "Sprint planning", priority: "medium", status: "not_started", dueAt: Date().addingTimeInterval(86400 * 4), type: "meeting"),
        ],
        configuration: nil
    )
}

struct StatsEntry: TimelineEntry {
    let date: Date
    let stats: WidgetStats
    let configuration: ConfigurationAppIntent?

    static let placeholder = StatsEntry(
        date: Date(),
        stats: .placeholder,
        configuration: nil
    )
}

// MARK: - App Intent for Configuration

import AppIntents

struct ConfigurationAppIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Configure Widget"
    static var description = IntentDescription("Customize your widget display.")

    @Parameter(title: "Show Completed")
    var showCompleted: Bool

    init() {
        showCompleted = false
    }

    init(showCompleted: Bool) {
        self.showCompleted = showCompleted
    }
}
