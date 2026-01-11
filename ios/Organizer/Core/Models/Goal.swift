import Foundation
import SwiftData

@Model
final class Goal: Identifiable, Hashable {
    static func == (lhs: Goal, rhs: Goal) -> Bool {
        lhs.id == rhs.id
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }

    @Attribute(.unique) var id: String
    var userId: String
    var title: String
    var target: Double?
    var unit: String?
    var current: Double?
    var startDate: Date?
    var endDate: Date?
    var status: String?
    var area: String?
    var projectId: String?
    var createdAt: Date
    var updatedAt: Date

    var needsSync: Bool = false

    var progress: Double {
        guard let target = target, target > 0, let current = current else { return 0 }
        return min(current / target, 1.0)
    }

    var progressPercentage: Int {
        Int(progress * 100)
    }

    init(
        id: String = UUID().uuidString,
        userId: String,
        title: String,
        target: Double? = nil,
        unit: String? = nil,
        current: Double? = nil,
        startDate: Date? = nil,
        endDate: Date? = nil,
        status: String? = "active",
        area: String? = nil,
        projectId: String? = nil,
        createdAt: Date = Date(),
        updatedAt: Date = Date()
    ) {
        self.id = id
        self.userId = userId
        self.title = title
        self.target = target
        self.unit = unit
        self.current = current
        self.startDate = startDate
        self.endDate = endDate
        self.status = status
        self.area = area
        self.projectId = projectId
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

struct GoalResponse: Codable {
    let goal: GoalDTO
}

struct GoalsResponse: Codable {
    let goals: [GoalDTO]
}

struct GoalDTO: Codable {
    let id: String
    let userId: String
    let title: String
    let target: Double?
    let unit: String?
    let current: Double?
    let startDate: String?
    let endDate: String?
    let status: String?
    let area: String?
    let projectId: String?
    let createdAt: String
    let updatedAt: String

    func toGoal() -> Goal {
        Goal(
            id: id,
            userId: userId,
            title: title,
            target: target,
            unit: unit,
            current: current,
            startDate: startDate.flatMap { ISO8601DateFormatter().date(from: $0) },
            endDate: endDate.flatMap { ISO8601DateFormatter().date(from: $0) },
            status: status,
            area: area,
            projectId: projectId,
            createdAt: ISO8601DateFormatter().date(from: createdAt) ?? Date(),
            updatedAt: ISO8601DateFormatter().date(from: updatedAt) ?? Date()
        )
    }
}
