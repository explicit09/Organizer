import Foundation

enum APIError: Error, LocalizedError {
    case invalidURL
    case invalidResponse
    case unauthorized
    case notFound
    case badRequest(String?)
    case serverError(Int)
    case decodingError(Error)
    case networkError(Error)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .invalidResponse:
            return "Invalid response from server"
        case .unauthorized:
            return "Please log in again"
        case .notFound:
            return "Resource not found"
        case .badRequest(let message):
            return message ?? "Invalid request"
        case .serverError(let code):
            return "Server error (\(code))"
        case .decodingError(let error):
            return "Failed to parse response: \(error.localizedDescription)"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        }
    }
}

actor APIClient {
    static let shared = APIClient()

    // MARK: - Configuration

    #if DEBUG
    private let baseURL = URL(string: "http://localhost:3000")!
    #else
    private let baseURL = URL(string: "https://your-production-url.com")!
    #endif

    private let session: URLSession

    private init() {
        let config = URLSessionConfiguration.default
        config.httpCookieStorage = HTTPCookieStorage.shared
        config.httpCookieAcceptPolicy = .always
        config.httpShouldSetCookies = true
        config.timeoutIntervalForRequest = 30
        self.session = URLSession(configuration: config)
    }

    // MARK: - Request Methods

    func request<T: Decodable>(_ endpoint: APIEndpoint) async throws -> T {
        let data = try await requestRaw(endpoint)

        do {
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            return try decoder.decode(T.self, from: data)
        } catch {
            print("Decoding error: \(error)")
            throw APIError.decodingError(error)
        }
    }

    func requestRaw(_ endpoint: APIEndpoint) async throws -> Data {
        let request = try buildRequest(for: endpoint)

        do {
            let (data, response) = try await session.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.invalidResponse
            }

            try validateResponse(httpResponse, data: data)

            return data
        } catch let error as APIError {
            throw error
        } catch {
            throw APIError.networkError(error)
        }
    }

    func requestVoid(_ endpoint: APIEndpoint) async throws {
        _ = try await requestRaw(endpoint)
    }

    // MARK: - Private Methods

    private func buildRequest(for endpoint: APIEndpoint) throws -> URLRequest {
        var components = URLComponents(url: baseURL.appendingPathComponent(endpoint.path), resolvingAgainstBaseURL: true)
        components?.queryItems = endpoint.queryItems

        guard let url = components?.url else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = endpoint.method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        if let body = endpoint.body {
            request.httpBody = body
        }

        return request
    }

    private func validateResponse(_ response: HTTPURLResponse, data: Data) throws {
        switch response.statusCode {
        case 200...299:
            return
        case 401:
            // Notify auth manager of unauthorized
            Task { @MainActor in
                AuthManager.shared.handleUnauthorized()
            }
            throw APIError.unauthorized
        case 404:
            throw APIError.notFound
        case 400:
            // Try to extract error message
            if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let message = json["error"] as? String {
                throw APIError.badRequest(message)
            }
            throw APIError.badRequest(nil)
        default:
            throw APIError.serverError(response.statusCode)
        }
    }
}

// MARK: - Convenience Extensions

extension APIClient {
    // Items
    func fetchItems(type: String? = nil, status: String? = nil) async throws -> [Item] {
        let response: ItemsResponse = try await request(.items(type: type, status: status))
        return response.items.map { $0.toItem() }
    }

    func fetchItem(id: String) async throws -> Item {
        let response: ItemResponse = try await request(.item(id: id))
        return response.item.toItem()
    }

    func createItem(title: String, type: String = "task", priority: String = "medium", dueAt: Date? = nil) async throws -> Item {
        let response: ItemResponse = try await request(.createItem(title: title, type: type, priority: priority, dueAt: dueAt))
        return response.item.toItem()
    }

    func updateItem(id: String, updates: [String: Any]) async throws -> Item {
        let response: ItemResponse = try await request(.updateItem(id: id, updates: updates))
        return response.item.toItem()
    }

    func deleteItem(id: String) async throws {
        try await requestVoid(.deleteItem(id: id))
    }

    // Projects
    func fetchProjects() async throws -> [Project] {
        let response: ProjectsResponse = try await request(.projects)
        return response.projects.map { $0.toProject() }
    }

    func createProject(name: String, area: String? = nil, goal: String? = nil) async throws -> Project {
        let response: ProjectResponse = try await request(.createProject(name: name, area: area, goal: goal))
        return response.project.toProject()
    }

    // Notes
    func fetchNotes() async throws -> [Note] {
        let response: NotesResponse = try await request(.notes)
        return response.notes.map { $0.toNote() }
    }

    // Goals
    func fetchGoals() async throws -> [Goal] {
        let response: GoalsResponse = try await request(.goals)
        return response.goals.map { $0.toGoal() }
    }

    // Search
    func search(query: String) async throws -> [Item] {
        let response: ItemsResponse = try await request(.search(query: query))
        return response.items.map { $0.toItem() }
    }
}
