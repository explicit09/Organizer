import Foundation
import SwiftData

@Model
final class Project: Identifiable, Hashable {
    static func == (lhs: Project, rhs: Project) -> Bool {
        lhs.id == rhs.id
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }

    @Attribute(.unique) var id: String
    var userId: String
    var name: String
    var area: String?
    var goal: String?
    var status: String?
    var startDate: Date?
    var deadline: Date?
    var createdAt: Date
    var updatedAt: Date

    var needsSync: Bool = false

    init(
        id: String = UUID().uuidString,
        userId: String,
        name: String,
        area: String? = nil,
        goal: String? = nil,
        status: String? = "active",
        startDate: Date? = nil,
        deadline: Date? = nil,
        createdAt: Date = Date(),
        updatedAt: Date = Date()
    ) {
        self.id = id
        self.userId = userId
        self.name = name
        self.area = area
        self.goal = goal
        self.status = status
        self.startDate = startDate
        self.deadline = deadline
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

struct ProjectResponse: Codable {
    let project: ProjectDTO
}

struct ProjectsResponse: Codable {
    let projects: [ProjectDTO]
}

struct ProjectDTO: Codable {
    let id: String
    let userId: String
    let name: String
    let area: String?
    let goal: String?
    let status: String?
    let startDate: String?
    let deadline: String?
    let createdAt: String
    let updatedAt: String

    func toProject() -> Project {
        Project(
            id: id,
            userId: userId,
            name: name,
            area: area,
            goal: goal,
            status: status,
            startDate: startDate.flatMap { ISO8601DateFormatter().date(from: $0) },
            deadline: deadline.flatMap { ISO8601DateFormatter().date(from: $0) },
            createdAt: ISO8601DateFormatter().date(from: createdAt) ?? Date(),
            updatedAt: ISO8601DateFormatter().date(from: updatedAt) ?? Date()
        )
    }
}
