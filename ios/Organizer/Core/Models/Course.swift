import Foundation
import SwiftData

@Model
final class Course: Identifiable {
    @Attribute(.unique) var id: String
    var userId: String
    var name: String
    var term: String?
    var instructor: String?
    var createdAt: Date
    var updatedAt: Date

    var needsSync: Bool = false

    init(
        id: String = UUID().uuidString,
        userId: String,
        name: String,
        term: String? = nil,
        instructor: String? = nil,
        createdAt: Date = Date(),
        updatedAt: Date = Date()
    ) {
        self.id = id
        self.userId = userId
        self.name = name
        self.term = term
        self.instructor = instructor
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

struct CourseResponse: Codable {
    let course: CourseDTO
}

struct CoursesResponse: Codable {
    let courses: [CourseDTO]
}

struct CourseDTO: Codable {
    let id: String
    let userId: String
    let name: String
    let term: String?
    let instructor: String?
    let createdAt: String
    let updatedAt: String

    func toCourse() -> Course {
        Course(
            id: id,
            userId: userId,
            name: name,
            term: term,
            instructor: instructor,
            createdAt: ISO8601DateFormatter().date(from: createdAt) ?? Date(),
            updatedAt: ISO8601DateFormatter().date(from: updatedAt) ?? Date()
        )
    }
}
