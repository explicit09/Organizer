import Foundation
import SwiftUI

@MainActor
class DashboardViewModel: ObservableObject {
    @Published var items: [Item] = []
    @Published var isLoading = true
    @Published var error: String?

    var dueToday: [Item] {
        let calendar = Calendar.current
        return items.filter { item in
            guard let dueAt = item.dueAt else { return false }
            return calendar.isDateInToday(dueAt) && item.status != .completed
        }
    }

    var overdue: [Item] {
        let now = Date()
        return items.filter { item in
            guard let dueAt = item.dueAt else { return false }
            return dueAt < now && item.status != .completed
        }
    }

    var inProgress: [Item] {
        items.filter { $0.status == .in_progress }
    }

    var upcoming: [Item] {
        let now = Date()
        let weekFromNow = Calendar.current.date(byAdding: .day, value: 7, to: now)!
        return items
            .filter { item in
                guard let dueAt = item.dueAt else { return false }
                return dueAt > now && dueAt <= weekFromNow && item.status != .completed
            }
            .sorted { ($0.dueAt ?? .distantFuture) < ($1.dueAt ?? .distantFuture) }
            .prefix(5)
            .map { $0 }
    }

    var completedThisWeek: Int {
        let calendar = Calendar.current
        let startOfWeek = calendar.date(from: calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: Date()))!
        return items.filter { item in
            item.status == .completed && item.updatedAt >= startOfWeek
        }.count
    }

    func loadData() async {
        isLoading = true
        error = nil

        do {
            items = try await APIClient.shared.fetchItems(type: nil, status: nil)
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }
}
