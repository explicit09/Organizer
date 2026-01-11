import Foundation

struct User: Codable, Identifiable {
    let id: String
    let email: String
    let name: String?
    let createdAt: String
    let updatedAt: String

    var displayName: String {
        name ?? email.components(separatedBy: "@").first ?? "User"
    }

    var initials: String {
        let components = displayName.components(separatedBy: " ")
        if components.count >= 2 {
            return String(components[0].prefix(1) + components[1].prefix(1)).uppercased()
        }
        return String(displayName.prefix(2)).uppercased()
    }
}

struct UserResponse: Codable {
    let user: User?
}

struct AuthResponse: Codable {
    let user: User
}
