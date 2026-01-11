import SwiftUI

struct ProjectDetailView: View {
    let project: Project
    @State private var items: [Item] = []
    @State private var isLoading = true
    @State private var error: String?

    var body: some View {
        List {
            Section("Details") {
                if let goal = project.goal {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Goal")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(goal)
                    }
                }

                if let area = project.area {
                    LabeledContent("Area", value: area)
                }

                if let status = project.status {
                    LabeledContent("Status", value: status.capitalized)
                }

                if let startDate = project.startDate {
                    LabeledContent("Start Date") {
                        Text(startDate.formatted(date: .abbreviated, time: .omitted))
                    }
                }

                if let deadline = project.deadline {
                    LabeledContent("Deadline") {
                        Text(deadline.formatted(date: .abbreviated, time: .omitted))
                    }
                }
            }

            Section("Tasks") {
                if isLoading {
                    HStack {
                        Spacer()
                        ProgressView()
                        Spacer()
                    }
                } else if items.isEmpty {
                    Text("No tasks in this project")
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, alignment: .center)
                } else {
                    ForEach(items) { item in
                        HStack {
                            Image(systemName: item.status == .completed ? "checkmark.circle.fill" : "circle")
                                .foregroundStyle(item.status == .completed ? .green : .secondary)

                            Text(item.title)
                                .strikethrough(item.status == .completed)
                        }
                    }
                }
            }

            Section("Info") {
                LabeledContent("Created") {
                    Text(project.createdAt.formatted(date: .abbreviated, time: .shortened))
                }
            }
        }
        .navigationTitle(project.name)
        .navigationBarTitleDisplayMode(.large)
        .task {
            await loadProjectItems()
        }
    }

    private func loadProjectItems() async {
        isLoading = true
        do {
            // Fetch all items and filter by projectId
            let allItems = try await APIClient.shared.fetchItems(type: nil, status: nil)
            items = allItems.filter { $0.projectId == project.id }
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}

#Preview {
    NavigationStack {
        ProjectDetailView(project: Project(
            id: "1",
            userId: "user1",
            name: "Sample Project",
            goal: "Complete the iOS app",
            area: "Work",
            status: "active",
            startDate: Date(),
            deadline: Date().addingTimeInterval(86400 * 30),
            createdAt: Date(),
            updatedAt: Date()
        ))
    }
}
