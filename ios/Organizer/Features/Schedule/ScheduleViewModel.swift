import Foundation
import SwiftUI

@MainActor
class ScheduleViewModel: ObservableObject {
    @Published var items: [Item] = []
    @Published var selectedDate = Date()
    @Published var isLoading = false
    @Published var error: String?

    var itemsForSelectedDate: [Item] {
        items.filter { item in
            guard let dueAt = item.dueAt else { return false }
            return Calendar.current.isDate(dueAt, inSameDayAs: selectedDate)
        }
        .sorted { ($0.dueAt ?? .distantFuture) < ($1.dueAt ?? .distantFuture) }
    }

    var datesWithItems: Set<Date> {
        Set(items.compactMap { item -> Date? in
            guard let dueAt = item.dueAt else { return nil }
            return Calendar.current.startOfDay(for: dueAt)
        })
    }

    func loadItems() async {
        isLoading = true
        error = nil

        do {
            items = try await APIClient.shared.fetchItems(type: nil, status: nil)
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
}
