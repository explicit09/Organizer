import Foundation
import SwiftUI

@MainActor
class TaskViewModel: ObservableObject {
    @Published var items: [Item] = []
    @Published var isLoading = false
    @Published var error: String?

    @Published var filterStatus: ItemStatus?
    @Published var filterPriority: Priority?
    @Published var searchText = ""

    var filteredItems: [Item] {
        var result = items

        // Filter by status
        if let status = filterStatus {
            result = result.filter { $0.status == status }
        }

        // Filter by priority
        if let priority = filterPriority {
            result = result.filter { $0.priority == priority }
        }

        // Search filter
        if !searchText.isEmpty {
            result = result.filter {
                $0.title.localizedCaseInsensitiveContains(searchText)
            }
        }

        return result
    }

    var groupedItems: [(String, [Item])] {
        let grouped = Dictionary(grouping: filteredItems) { item -> String in
            if item.status == .completed {
                return "Completed"
            }
            if let dueAt = item.dueAt {
                if Calendar.current.isDateInToday(dueAt) {
                    return "Today"
                } else if Calendar.current.isDateInTomorrow(dueAt) {
                    return "Tomorrow"
                } else if dueAt < Date() {
                    return "Overdue"
                } else {
                    return "Upcoming"
                }
            }
            return "No Due Date"
        }

        let order = ["Overdue", "Today", "Tomorrow", "Upcoming", "No Due Date", "Completed"]
        return order.compactMap { key in
            if let items = grouped[key], !items.isEmpty {
                return (key, items)
            }
            return nil
        }
    }

    func loadItems() async {
        isLoading = true
        error = nil

        do {
            items = try await APIClient.shared.fetchItems(type: "task", status: nil)
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    func toggleComplete(_ item: Item) async {
        let newStatus: ItemStatus = item.status == .completed ? .not_started : .completed
        do {
            let updated = try await APIClient.shared.updateItem(
                id: item.id,
                updates: ["status": newStatus.rawValue]
            )
            if let index = items.firstIndex(where: { $0.id == item.id }) {
                items[index] = updated
            }
        } catch {
            self.error = error.localizedDescription
        }
    }

    func deleteItem(_ item: Item) async {
        do {
            try await APIClient.shared.deleteItem(id: item.id)
            items.removeAll { $0.id == item.id }
        } catch {
            self.error = error.localizedDescription
        }
    }

    func createItem(title: String, priority: Priority, dueAt: Date?) async {
        do {
            let newItem = try await APIClient.shared.createItem(
                title: title,
                type: "task",
                priority: priority.rawValue,
                dueAt: dueAt
            )
            items.insert(newItem, at: 0)
        } catch {
            self.error = error.localizedDescription
        }
    }
}
