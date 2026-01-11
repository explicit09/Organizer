import Foundation
import SwiftUI

@MainActor
class GoalViewModel: ObservableObject {
    @Published var goals: [Goal] = []
    @Published var isLoading = false
    @Published var error: String?
    @Published var filterStatus: String?

    var filteredGoals: [Goal] {
        var result = goals

        if let status = filterStatus {
            result = result.filter { $0.status == status }
        }

        return result.sorted { ($0.endDate ?? .distantFuture) < ($1.endDate ?? .distantFuture) }
    }

    var activeGoals: [Goal] {
        goals.filter { $0.status == "active" }
    }

    var completedGoals: [Goal] {
        goals.filter { $0.status == "completed" }
    }

    func loadGoals() async {
        isLoading = true
        error = nil

        do {
            goals = try await APIClient.shared.fetchGoals()
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    func createGoal(title: String, target: Double?, unit: String?) async -> Goal? {
        do {
            let response: GoalResponse = try await APIClient.shared.request(
                .createGoal(title: title, target: target, unit: unit)
            )
            let newGoal = response.goal.toGoal()
            goals.insert(newGoal, at: 0)
            return newGoal
        } catch {
            self.error = error.localizedDescription
            return nil
        }
    }

    func updateGoal(id: String, updates: [String: Any]) async -> Goal? {
        do {
            let response: GoalResponse = try await APIClient.shared.request(
                .updateGoal(id: id, updates: updates)
            )
            let updatedGoal = response.goal.toGoal()
            if let index = goals.firstIndex(where: { $0.id == id }) {
                goals[index] = updatedGoal
            }
            return updatedGoal
        } catch {
            self.error = error.localizedDescription
            return nil
        }
    }

    func updateProgress(goalId: String, newValue: Double) async {
        _ = await updateGoal(id: goalId, updates: ["current": newValue])
    }

    func completeGoal(goalId: String) async {
        _ = await updateGoal(id: goalId, updates: ["status": "completed"])
    }
}
