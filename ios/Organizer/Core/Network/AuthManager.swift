import Foundation
import SwiftUI

@MainActor
class AuthManager: ObservableObject {
    static let shared = AuthManager()

    @Published var currentUser: User?
    @Published var isAuthenticated = false
    @Published var isLoading = true
    @Published var errorMessage: String?

    private init() {}

    // MARK: - Auth Methods

    func checkAuth() async {
        isLoading = true
        defer { isLoading = false }

        do {
            let response: UserResponse = try await APIClient.shared.request(.me)
            if let user = response.user {
                self.currentUser = user
                self.isAuthenticated = true
            } else {
                self.isAuthenticated = false
            }
        } catch {
            self.isAuthenticated = false
            self.currentUser = nil
        }
    }

    func login(email: String, password: String) async throws {
        errorMessage = nil

        do {
            let response: AuthResponse = try await APIClient.shared.request(.login(email: email, password: password))
            self.currentUser = response.user
            self.isAuthenticated = true
        } catch let error as APIError {
            self.errorMessage = error.localizedDescription
            throw error
        }
    }

    func register(email: String, password: String, name: String?) async throws {
        errorMessage = nil

        do {
            let response: AuthResponse = try await APIClient.shared.request(.register(email: email, password: password, name: name))
            self.currentUser = response.user
            self.isAuthenticated = true
        } catch let error as APIError {
            self.errorMessage = error.localizedDescription
            throw error
        }
    }

    func logout() async {
        do {
            try await APIClient.shared.requestVoid(.logout)
        } catch {
            print("Logout error: \(error)")
        }

        self.currentUser = nil
        self.isAuthenticated = false

        // Clear cookies
        if let cookies = HTTPCookieStorage.shared.cookies {
            for cookie in cookies {
                HTTPCookieStorage.shared.deleteCookie(cookie)
            }
        }
    }

    func handleUnauthorized() {
        self.currentUser = nil
        self.isAuthenticated = false
    }
}
