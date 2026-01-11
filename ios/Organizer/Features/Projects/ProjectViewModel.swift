import Foundation
import SwiftUI

@MainActor
class ProjectViewModel: ObservableObject {
    @Published var projects: [Project] = []
    @Published var isLoading = false
    @Published var error: String?
    @Published var searchText = ""

    var filteredProjects: [Project] {
        if searchText.isEmpty {
            return projects
        }
        return projects.filter {
            $0.name.localizedCaseInsensitiveContains(searchText)
        }
    }

    func loadProjects() async {
        isLoading = true
        error = nil

        do {
            projects = try await APIClient.shared.fetchProjects()
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    func createProject(name: String, area: String?, goal: String?) async {
        do {
            let newProject = try await APIClient.shared.createProject(
                name: name,
                area: area,
                goal: goal
            )
            projects.insert(newProject, at: 0)
        } catch {
            self.error = error.localizedDescription
        }
    }
}
