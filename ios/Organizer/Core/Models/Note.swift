import Foundation
import SwiftData

@Model
final class Note: Identifiable, Hashable {
    static func == (lhs: Note, rhs: Note) -> Bool {
        lhs.id == rhs.id
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }

    @Attribute(.unique) var id: String
    var userId: String
    var itemId: String?
    var title: String
    var content: String?
    var tags: [String]
    var createdAt: Date
    var updatedAt: Date

    var needsSync: Bool = false

    init(
        id: String = UUID().uuidString,
        userId: String,
        itemId: String? = nil,
        title: String,
        content: String? = nil,
        tags: [String] = [],
        createdAt: Date = Date(),
        updatedAt: Date = Date()
    ) {
        self.id = id
        self.userId = userId
        self.itemId = itemId
        self.title = title
        self.content = content
        self.tags = tags
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

struct NoteResponse: Codable {
    let note: NoteDTO
}

struct NotesResponse: Codable {
    let notes: [NoteDTO]
}

struct NoteDTO: Codable {
    let id: String
    let userId: String
    let itemId: String?
    let title: String
    let content: String?
    let tags: [String]?
    let createdAt: String
    let updatedAt: String

    func toNote() -> Note {
        Note(
            id: id,
            userId: userId,
            itemId: itemId,
            title: title,
            content: content,
            tags: tags ?? [],
            createdAt: ISO8601DateFormatter().date(from: createdAt) ?? Date(),
            updatedAt: ISO8601DateFormatter().date(from: updatedAt) ?? Date()
        )
    }
}
