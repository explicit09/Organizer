import SwiftUI

struct ProjectListView: View {
    @StateObject private var viewModel = ProjectViewModel()
    @State private var showAddProject = false

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.projects.isEmpty {
                    LoadingView(message: "Loading projects...")
                } else if let error = viewModel.error, viewModel.projects.isEmpty {
                    ErrorView(message: error) {
                        Task { await viewModel.loadProjects() }
                    }
                } else if viewModel.filteredProjects.isEmpty {
                    EmptyState(
                        icon: "folder",
                        title: viewModel.searchText.isEmpty ? "No Projects" : "No Results",
                        description: viewModel.searchText.isEmpty
                            ? "Create your first project to organize your tasks."
                            : "No projects match your search.",
                        actionTitle: viewModel.searchText.isEmpty ? "New Project" : nil
                    ) {
                        showAddProject = true
                    }
                } else {
                    projectList
                }
            }
            .navigationTitle("Projects")
            .searchable(text: $viewModel.searchText, prompt: "Search projects")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showAddProject = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .refreshable {
                await viewModel.loadProjects()
            }
            .task {
                await viewModel.loadProjects()
            }
            .sheet(isPresented: $showAddProject) {
                ProjectFormView { name, area, goal in
                    await viewModel.createProject(name: name, area: area, goal: goal)
                }
            }
        }
    }

    private var projectList: some View {
        List(viewModel.filteredProjects) { project in
            NavigationLink(value: project) {
                ProjectRow(project: project)
            }
        }
        .listStyle(.insetGrouped)
        .navigationDestination(for: Project.self) { project in
            ProjectDetailView(project: project)
        }
    }
}

// MARK: - Project Row

struct ProjectRow: View {
    let project: Project

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "folder.fill")
                .font(.title2)
                .foregroundStyle(areaColor)

            VStack(alignment: .leading, spacing: 4) {
                Text(project.name)
                    .font(.headline)

                if let area = project.area {
                    Text(area)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()

            if let status = project.status {
                Text(status.capitalized)
                    .font(.caption)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(statusColor(status).opacity(0.1))
                    .foregroundStyle(statusColor(status))
                    .clipShape(Capsule())
            }
        }
        .padding(.vertical, 4)
    }

    private var areaColor: Color {
        switch project.area?.lowercased() {
        case "work": return .blue
        case "personal": return .green
        case "health": return .red
        case "learning": return .purple
        default: return .orange
        }
    }

    private func statusColor(_ status: String) -> Color {
        switch status.lowercased() {
        case "active": return .green
        case "completed": return .blue
        case "on_hold": return .orange
        case "archived": return .gray
        default: return .secondary
        }
    }
}

#Preview {
    ProjectListView()
}
