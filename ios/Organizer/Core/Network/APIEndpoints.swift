import Foundation

enum HTTPMethod: String {
    case GET, POST, PATCH, PUT, DELETE
}

enum APIEndpoint {
    // Auth
    case login(email: String, password: String)
    case register(email: String, password: String, name: String?)
    case me
    case logout

    // Items
    case items(type: String?, status: String?)
    case item(id: String)
    case createItem(title: String, type: String, priority: String, dueAt: Date?)
    case updateItem(id: String, updates: [String: Any])
    case deleteItem(id: String)

    // Subtasks
    case subtasks(itemId: String)
    case createSubtask(itemId: String, title: String, priority: String?)

    // Projects
    case projects
    case project(id: String)
    case createProject(name: String, area: String?, goal: String?)

    // Notes
    case notes
    case note(id: String)
    case createNote(title: String, content: String?, itemId: String?)
    case updateNote(id: String, title: String?, content: String?)
    case deleteNote(id: String)

    // Goals
    case goals
    case goal(id: String)
    case createGoal(title: String, target: Double?, unit: String?)
    case updateGoal(id: String, updates: [String: Any])

    // Search
    case search(query: String)

    // Notifications
    case notifications
    case markAllRead

    // Analytics
    case analytics(days: Int?)

    var path: String {
        switch self {
        case .login: return "/api/auth/login"
        case .register: return "/api/auth/register"
        case .me: return "/api/auth/me"
        case .logout: return "/api/auth/logout"

        case .items: return "/api/items"
        case .item(let id): return "/api/items/\(id)"
        case .createItem: return "/api/items"
        case .updateItem(let id, _): return "/api/items/\(id)"
        case .deleteItem(let id): return "/api/items/\(id)"

        case .subtasks(let itemId): return "/api/items/\(itemId)/subtasks"
        case .createSubtask(let itemId, _, _): return "/api/items/\(itemId)/subtasks"

        case .projects: return "/api/projects"
        case .project(let id): return "/api/projects/\(id)"
        case .createProject: return "/api/projects"

        case .notes: return "/api/notes"
        case .note(let id): return "/api/notes/\(id)"
        case .createNote: return "/api/notes"
        case .updateNote(let id, _, _): return "/api/notes/\(id)"
        case .deleteNote(let id): return "/api/notes/\(id)"

        case .goals: return "/api/goals"
        case .goal(let id): return "/api/goals/\(id)"
        case .createGoal: return "/api/goals"
        case .updateGoal(let id, _): return "/api/goals/\(id)"

        case .search: return "/api/search"
        case .notifications: return "/api/notifications"
        case .markAllRead: return "/api/notifications"
        case .analytics: return "/api/analytics"
        }
    }

    var method: HTTPMethod {
        switch self {
        case .login, .register, .logout, .createItem, .createSubtask,
             .createProject, .createNote, .createGoal, .markAllRead:
            return .POST
        case .updateItem, .updateNote, .updateGoal:
            return .PATCH
        case .deleteItem, .deleteNote:
            return .DELETE
        default:
            return .GET
        }
    }

    var queryItems: [URLQueryItem]? {
        switch self {
        case .items(let type, let status):
            var items: [URLQueryItem] = []
            if let type = type { items.append(URLQueryItem(name: "type", value: type)) }
            if let status = status { items.append(URLQueryItem(name: "status", value: status)) }
            return items.isEmpty ? nil : items
        case .search(let query):
            return [URLQueryItem(name: "q", value: query)]
        case .analytics(let days):
            if let days = days {
                return [URLQueryItem(name: "days", value: String(days))]
            }
            return nil
        default:
            return nil
        }
    }

    var body: Data? {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601

        switch self {
        case .login(let email, let password):
            return try? encoder.encode(["email": email, "password": password])

        case .register(let email, let password, let name):
            var data: [String: String] = ["email": email, "password": password]
            if let name = name { data["name"] = name }
            return try? encoder.encode(data)

        case .createItem(let title, let type, let priority, let dueAt):
            var data: [String: Any] = [
                "title": title,
                "type": type,
                "priority": priority
            ]
            if let dueAt = dueAt {
                data["dueAt"] = ISO8601DateFormatter().string(from: dueAt)
            }
            return try? JSONSerialization.data(withJSONObject: data)

        case .updateItem(_, let updates):
            return try? JSONSerialization.data(withJSONObject: updates)

        case .createSubtask(_, let title, let priority):
            var data: [String: String] = ["title": title]
            if let priority = priority { data["priority"] = priority }
            return try? encoder.encode(data)

        case .createProject(let name, let area, let goal):
            var data: [String: String] = ["name": name]
            if let area = area { data["area"] = area }
            if let goal = goal { data["goal"] = goal }
            return try? encoder.encode(data)

        case .createNote(let title, let content, let itemId):
            var data: [String: String] = ["title": title]
            if let content = content { data["content"] = content }
            if let itemId = itemId { data["itemId"] = itemId }
            return try? encoder.encode(data)

        case .updateNote(_, let title, let content):
            var data: [String: String] = [:]
            if let title = title { data["title"] = title }
            if let content = content { data["content"] = content }
            return try? encoder.encode(data)

        case .createGoal(let title, let target, let unit):
            var data: [String: Any] = ["title": title]
            if let target = target { data["target"] = target }
            if let unit = unit { data["unit"] = unit }
            return try? JSONSerialization.data(withJSONObject: data)

        case .updateGoal(_, let updates):
            return try? JSONSerialization.data(withJSONObject: updates)

        case .markAllRead:
            return try? encoder.encode(["action": "markAllRead"])

        default:
            return nil
        }
    }
}
