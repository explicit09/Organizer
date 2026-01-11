import SwiftUI

struct TaskListView: View {
    @StateObject private var viewModel = TaskViewModel()
    @State private var showAddTask = false
    @State private var showFilters = false

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.items.isEmpty {
                    LoadingView(message: "Loading tasks...")
                } else if let error = viewModel.error, viewModel.items.isEmpty {
                    ErrorView(message: error) {
                        Task { await viewModel.loadItems() }
                    }
                } else if viewModel.filteredItems.isEmpty {
                    EmptyState(
                        icon: "checklist",
                        title: viewModel.searchText.isEmpty ? "No Tasks" : "No Results",
                        description: viewModel.searchText.isEmpty
                            ? "Create your first task to get started."
                            : "No tasks match your search.",
                        actionTitle: viewModel.searchText.isEmpty ? "Add Task" : nil
                    ) {
                        showAddTask = true
                    }
                } else {
                    taskList
                }
            }
            .navigationTitle("Tasks")
            .searchable(text: $viewModel.searchText, prompt: "Search tasks")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    filterMenu
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showAddTask = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .refreshable {
                await viewModel.loadItems()
            }
            .task {
                await viewModel.loadItems()
            }
            .sheet(isPresented: $showAddTask) {
                TaskFormView { title, priority, dueAt in
                    await viewModel.createItem(title: title, priority: priority, dueAt: dueAt)
                }
            }
        }
    }

    private var taskList: some View {
        List {
            ForEach(viewModel.groupedItems, id: \.0) { section, items in
                Section(section) {
                    ForEach(items) { item in
                        NavigationLink(value: item) {
                            TaskRow(
                                item: item,
                                onToggle: {
                                    Task { await viewModel.toggleComplete(item) }
                                }
                            )
                        }
                        .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                            Button(role: .destructive) {
                                Task { await viewModel.deleteItem(item) }
                            } label: {
                                Label("Delete", systemImage: "trash")
                            }
                        }
                        .swipeActions(edge: .leading, allowsFullSwipe: true) {
                            Button {
                                Task { await viewModel.toggleComplete(item) }
                            } label: {
                                Label(
                                    item.status == .completed ? "Undo" : "Complete",
                                    systemImage: item.status == .completed ? "arrow.uturn.backward" : "checkmark"
                                )
                            }
                            .tint(item.status == .completed ? .orange : .green)
                        }
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .navigationDestination(for: Item.self) { item in
            TaskDetailView(item: item)
        }
    }

    private var filterMenu: some View {
        Menu {
            Section("Status") {
                Button {
                    viewModel.filterStatus = nil
                } label: {
                    Label("All", systemImage: viewModel.filterStatus == nil ? "checkmark" : "")
                }
                ForEach([ItemStatus.not_started, .in_progress, .completed, .blocked], id: \.self) { status in
                    Button {
                        viewModel.filterStatus = status
                    } label: {
                        Label(status.displayName, systemImage: viewModel.filterStatus == status ? "checkmark" : "")
                    }
                }
            }

            Section("Priority") {
                Button {
                    viewModel.filterPriority = nil
                } label: {
                    Label("All", systemImage: viewModel.filterPriority == nil ? "checkmark" : "")
                }
                ForEach([Priority.urgent, .high, .medium, .low], id: \.self) { priority in
                    Button {
                        viewModel.filterPriority = priority
                    } label: {
                        Label(priority.rawValue.capitalized, systemImage: viewModel.filterPriority == priority ? "checkmark" : "")
                    }
                }
            }
        } label: {
            Image(systemName: hasActiveFilters ? "line.3.horizontal.decrease.circle.fill" : "line.3.horizontal.decrease.circle")
        }
    }

    private var hasActiveFilters: Bool {
        viewModel.filterStatus != nil || viewModel.filterPriority != nil
    }
}

// MARK: - Task Row

struct TaskRow: View {
    let item: Item
    let onToggle: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            Button(action: onToggle) {
                Image(systemName: item.status == .completed ? "checkmark.circle.fill" : "circle")
                    .font(.title2)
                    .foregroundStyle(item.status == .completed ? .green : .secondary)
            }
            .buttonStyle(.plain)

            VStack(alignment: .leading, spacing: 4) {
                Text(item.title)
                    .strikethrough(item.status == .completed)
                    .foregroundStyle(item.status == .completed ? .secondary : .primary)

                HStack(spacing: 8) {
                    if let dueAt = item.dueAt {
                        Label {
                            Text(dueAt.formatted(date: .abbreviated, time: .omitted))
                        } icon: {
                            Image(systemName: "calendar")
                        }
                        .font(.caption)
                        .foregroundStyle(isOverdue(dueAt) ? .red : .secondary)
                    }

                    PriorityBadge(priority: item.priority)
                }
            }
        }
        .padding(.vertical, 4)
    }

    private func isOverdue(_ date: Date) -> Bool {
        date < Date() && item.status != .completed
    }
}

// MARK: - Item Status Extension

extension ItemStatus {
    var displayName: String {
        switch self {
        case .not_started: return "Not Started"
        case .in_progress: return "In Progress"
        case .completed: return "Completed"
        case .blocked: return "Blocked"
        }
    }
}

#Preview {
    TaskListView()
}
