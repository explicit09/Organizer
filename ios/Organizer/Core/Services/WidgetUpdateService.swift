import Foundation
import WidgetKit

/// Service to update widget data from the main app
/// Call these methods whenever data changes to keep widgets in sync
class WidgetUpdateService {
    static let shared = WidgetUpdateService()

    private let appGroupIdentifier = "group.com.organizer.app"

    private var sharedDefaults: UserDefaults? {
        UserDefaults(suiteName: appGroupIdentifier)
    }

    private init() {}

    // MARK: - Update Widget Data

    /// Call this after fetching items from the API
    func updateTasks(_ items: [Item]) {
        let widgetTasks = items.map { item in
            WidgetTaskData(
                id: item.id,
                title: item.title,
                priority: item.priority.rawValue,
                status: item.status.rawValue,
                dueAt: item.dueAt,
                type: item.type.rawValue
            )
        }

        guard let defaults = sharedDefaults,
              let data = try? JSONEncoder().encode(widgetTasks) else { return }
        defaults.set(data, forKey: "widgetTasks")
        defaults.set(Date(), forKey: "widgetLastUpdate")

        // Also update stats
        updateStats(from: items)

        // Refresh widgets
        WidgetCenter.shared.reloadAllTimelines()
    }

    /// Update stats based on current items
    private func updateStats(from items: [Item]) {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        let tomorrow = calendar.date(byAdding: .day, value: 1, to: today)!
        let startOfWeek = calendar.date(from: calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: Date()))!

        let dueToday = items.filter { item in
            guard let dueAt = item.dueAt else { return false }
            return dueAt >= today && dueAt < tomorrow && item.status != .completed
        }.count

        let inProgress = items.filter { $0.status == .in_progress }.count

        let overdue = items.filter { item in
            guard let dueAt = item.dueAt else { return false }
            return dueAt < today && item.status != .completed
        }.count

        let completedToday = items.filter { item in
            item.status == .completed && item.updatedAt >= today
        }.count

        let completedThisWeek = items.filter { item in
            item.status == .completed && item.updatedAt >= startOfWeek
        }.count

        let totalActive = items.filter { $0.status != .completed }.count

        let stats = WidgetStatsData(
            dueToday: dueToday,
            inProgress: inProgress,
            overdue: overdue,
            completedToday: completedToday,
            completedThisWeek: completedThisWeek,
            totalActive: totalActive
        )

        guard let defaults = sharedDefaults,
              let data = try? JSONEncoder().encode(stats) else { return }
        defaults.set(data, forKey: "widgetStats")
    }

    /// Force refresh all widgets
    func refreshAllWidgets() {
        WidgetCenter.shared.reloadAllTimelines()
    }

    /// Refresh specific widget kind
    func refreshWidget(kind: String) {
        WidgetCenter.shared.reloadTimelines(ofKind: kind)
    }
}

// MARK: - Data Models for App Group Sharing

struct WidgetTaskData: Codable {
    let id: String
    let title: String
    let priority: String
    let status: String
    let dueAt: Date?
    let type: String
}

struct WidgetStatsData: Codable {
    let dueToday: Int
    let inProgress: Int
    let overdue: Int
    let completedToday: Int
    let completedThisWeek: Int
    let totalActive: Int
}
