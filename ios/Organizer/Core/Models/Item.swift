import Foundation
import SwiftData

// MARK: - Enums

enum ItemType: String, Codable, CaseIterable {
    case task
    case meeting
    case school
}

enum ItemStatus: String, Codable, CaseIterable {
    case not_started
    case in_progress
    case completed
    case blocked

    var displayName: String {
        switch self {
        case .not_started: return "Not Started"
        case .in_progress: return "In Progress"
        case .completed: return "Completed"
        case .blocked: return "Blocked"
        }
    }
}

enum Priority: String, Codable, CaseIterable {
    case urgent
    case high
    case medium
    case low

    var displayName: String { rawValue.capitalized }

    var color: String {
        switch self {
        case .urgent: return "red"
        case .high: return "orange"
        case .medium: return "blue"
        case .low: return "gray"
        }
    }

    var sortOrder: Int {
        switch self {
        case .urgent: return 0
        case .high: return 1
        case .medium: return 2
        case .low: return 3
        }
    }
}

// MARK: - Item Model

@Model
final class Item: Identifiable, Hashable {
    static func == (lhs: Item, rhs: Item) -> Bool {
        lhs.id == rhs.id
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
    @Attribute(.unique) var id: String
    var userId: String
    var type: ItemType
    var title: String
    var details: String?
    var status: ItemStatus
    var priority: Priority
    var tags: [String]
    var dueAt: Date?
    var startAt: Date?
    var endAt: Date?
    var estimatedMinutes: Int?

    // Relationships
    var parentId: String?
    var courseId: String?
    var projectId: String?
    var moduleId: String?
    var cycleId: String?

    // Meeting-specific
    var agenda: String?
    var bufferBefore: Int?
    var bufferAfter: Int?

    // School-specific
    var grade: Double?
    var gradeWeight: Double?

    // Metadata
    var area: String?
    var createdAt: Date
    var updatedAt: Date

    // Local sync status
    var needsSync: Bool = false

    init(
        id: String = UUID().uuidString,
        userId: String,
        type: ItemType = .task,
        title: String,
        details: String? = nil,
        status: ItemStatus = .not_started,
        priority: Priority = .medium,
        tags: [String] = [],
        dueAt: Date? = nil,
        createdAt: Date = Date(),
        updatedAt: Date = Date()
    ) {
        self.id = id
        self.userId = userId
        self.type = type
        self.title = title
        self.details = details
        self.status = status
        self.priority = priority
        self.tags = tags
        self.dueAt = dueAt
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

// MARK: - Codable Extension for API

extension Item {
    enum CodingKeys: String, CodingKey {
        case id, userId, type, title, details, status, priority, tags
        case dueAt, startAt, endAt, estimatedMinutes
        case parentId, courseId, projectId, moduleId, cycleId
        case agenda, bufferBefore, bufferAfter
        case grade, gradeWeight, area, createdAt, updatedAt
    }
}

// MARK: - API Response

struct ItemResponse: Codable {
    let item: ItemDTO
}

struct ItemsResponse: Codable {
    let items: [ItemDTO]
}

struct ItemDTO: Codable {
    let id: String
    let userId: String
    let type: String
    let title: String
    let details: String?
    let status: String
    let priority: String
    let tags: [String]?
    let dueAt: String?
    let startAt: String?
    let endAt: String?
    let estimatedMinutes: Int?
    let parentId: String?
    let courseId: String?
    let projectId: String?
    let moduleId: String?
    let cycleId: String?
    let agenda: String?
    let bufferBefore: Int?
    let bufferAfter: Int?
    let grade: Double?
    let gradeWeight: Double?
    let area: String?
    let createdAt: String
    let updatedAt: String

    func toItem() -> Item {
        let item = Item(
            id: id,
            userId: userId,
            type: ItemType(rawValue: type) ?? .task,
            title: title,
            details: details,
            status: ItemStatus(rawValue: status) ?? .not_started,
            priority: Priority(rawValue: priority) ?? .medium,
            tags: tags ?? [],
            dueAt: ISO8601DateFormatter().date(from: dueAt ?? ""),
            createdAt: ISO8601DateFormatter().date(from: createdAt) ?? Date(),
            updatedAt: ISO8601DateFormatter().date(from: updatedAt) ?? Date()
        )
        item.parentId = parentId
        item.courseId = courseId
        item.projectId = projectId
        item.estimatedMinutes = estimatedMinutes
        item.agenda = agenda
        item.grade = grade
        item.gradeWeight = gradeWeight
        item.area = area
        return item
    }
}
