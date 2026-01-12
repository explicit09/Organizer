import Foundation
import WidgetKit

/// Service for fetching data for widgets
/// Uses App Groups to share data between main app and widget extension
actor WidgetDataService {
    static let shared = WidgetDataService()

    private let appGroupIdentifier = "group.com.organizer.app"
    private let tasksKey = "widgetTasks"
    private let statsKey = "widgetStats"
    private let lastUpdateKey = "widgetLastUpdate"

    private var sharedDefaults: UserDefaults? {
        UserDefaults(suiteName: appGroupIdentifier)
    }

    // MARK: - Fetch from Cache

    func getTodayTasks() -> [WidgetTask] {
        guard let defaults = sharedDefaults,
              let data = defaults.data(forKey: tasksKey),
              let tasks = try? JSONDecoder().decode([WidgetTask].self, from: data) else {
            return []
        }

        let today = Calendar.current.startOfDay(for: Date())
        let tomorrow = Calendar.current.date(byAdding: .day, value: 1, to: today)!

        return tasks.filter { task in
            guard let dueAt = task.dueAt else { return false }
            return dueAt >= today && dueAt < tomorrow && !task.isCompleted
        }.sorted { $0.priorityLevel < $1.priorityLevel }
    }

    func getUpcomingTasks(limit: Int = 10) -> [WidgetTask] {
        guard let defaults = sharedDefaults,
              let data = defaults.data(forKey: tasksKey),
              let tasks = try? JSONDecoder().decode([WidgetTask].self, from: data) else {
            return []
        }

        let now = Date()
        return tasks.filter { task in
            guard let dueAt = task.dueAt else { return false }
            return dueAt > now && !task.isCompleted
        }
        .sorted { ($0.dueAt ?? .distantFuture) < ($1.dueAt ?? .distantFuture) }
        .prefix(limit)
        .map { $0 }
    }

    func getStats() -> WidgetStats {
        guard let defaults = sharedDefaults,
              let data = defaults.data(forKey: statsKey),
              let stats = try? JSONDecoder().decode(WidgetStats.self, from: data) else {
            return WidgetStats(
                dueToday: 0,
                inProgress: 0,
                overdue: 0,
                completedToday: 0,
                completedThisWeek: 0,
                totalActive: 0
            )
        }
        return stats
    }

    // MARK: - Save from Main App

    func saveTasks(_ tasks: [WidgetTask]) {
        guard let defaults = sharedDefaults,
              let data = try? JSONEncoder().encode(tasks) else { return }
        defaults.set(data, forKey: tasksKey)
        defaults.set(Date(), forKey: lastUpdateKey)
    }

    func saveStats(_ stats: WidgetStats) {
        guard let defaults = sharedDefaults,
              let data = try? JSONEncoder().encode(stats) else { return }
        defaults.set(data, forKey: statsKey)
    }

    // MARK: - Refresh

    func needsRefresh() -> Bool {
        guard let defaults = sharedDefaults,
              let lastUpdate = defaults.object(forKey: lastUpdateKey) as? Date else {
            return true
        }
        // Refresh if data is older than 15 minutes
        return Date().timeIntervalSince(lastUpdate) > 900
    }

    // MARK: - Network Fetch (for background refresh)

    func fetchFromNetwork() async -> [WidgetTask] {
        // In production, this would fetch from your API
        // For now, return cached data
        return getTodayTasks()
    }
}

// MARK: - Widget Refresh Helper

extension WidgetDataService {
    /// Call this from the main app when data changes
    static func refreshAllWidgets() {
        WidgetCenter.shared.reloadAllTimelines()
    }

    /// Call this from the main app to refresh specific widget
    static func refreshWidget(kind: String) {
        WidgetCenter.shared.reloadTimelines(ofKind: kind)
    }
}
