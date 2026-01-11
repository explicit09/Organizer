import SwiftUI

struct TaskDetailView: View {
    @Environment(\.dismiss) private var dismiss
    @State var item: Item
    @State private var isEditing = false
    @State private var isSaving = false
    @State private var error: String?

    // Edit state
    @State private var editTitle: String = ""
    @State private var editDetails: String = ""
    @State private var editPriority: Priority = .medium
    @State private var editStatus: ItemStatus = .not_started
    @State private var editDueAt: Date?
    @State private var hasDueDate = false

    var body: some View {
        List {
            if isEditing {
                editingContent
            } else {
                viewContent
            }
        }
        .navigationTitle(isEditing ? "Edit Task" : "Task Details")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                if isEditing {
                    Button("Save") {
                        Task { await saveChanges() }
                    }
                    .disabled(isSaving || editTitle.isEmpty)
                } else {
                    Button("Edit") {
                        startEditing()
                    }
                }
            }
            if isEditing {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") {
                        isEditing = false
                    }
                }
            }
        }
        .alert("Error", isPresented: .constant(error != nil)) {
            Button("OK") { error = nil }
        } message: {
            Text(error ?? "")
        }
    }

    // MARK: - View Content

    @ViewBuilder
    private var viewContent: some View {
        Section {
            VStack(alignment: .leading, spacing: 8) {
                Text(item.title)
                    .font(.headline)

                HStack {
                    StatusBadge(status: item.status)
                    PriorityBadge(priority: item.priority)
                }
            }
            .padding(.vertical, 4)
        }

        if let details = item.details, !details.isEmpty {
            Section("Details") {
                Text(details)
                    .font(.body)
            }
        }

        Section("Info") {
            if let dueAt = item.dueAt {
                LabeledContent("Due Date") {
                    Text(dueAt.formatted(date: .long, time: .shortened))
                }
            }

            LabeledContent("Created") {
                Text(item.createdAt.formatted(date: .abbreviated, time: .shortened))
            }

            LabeledContent("Updated") {
                Text(item.updatedAt.formatted(date: .abbreviated, time: .shortened))
            }
        }

        Section {
            Button {
                Task { await toggleComplete() }
            } label: {
                Label(
                    item.status == .completed ? "Mark as Not Started" : "Mark as Complete",
                    systemImage: item.status == .completed ? "arrow.uturn.backward.circle" : "checkmark.circle"
                )
            }
            .tint(item.status == .completed ? .orange : .green)
        }
    }

    // MARK: - Editing Content

    @ViewBuilder
    private var editingContent: some View {
        Section {
            TextField("Title", text: $editTitle)
        }

        Section("Details") {
            TextField("Add details...", text: $editDetails, axis: .vertical)
                .lineLimit(3...6)
        }

        Section("Status & Priority") {
            Picker("Status", selection: $editStatus) {
                ForEach([ItemStatus.not_started, .in_progress, .completed, .blocked], id: \.self) { status in
                    Text(status.displayName).tag(status)
                }
            }

            Picker("Priority", selection: $editPriority) {
                ForEach([Priority.urgent, .high, .medium, .low], id: \.self) { priority in
                    Text(priority.rawValue.capitalized).tag(priority)
                }
            }
        }

        Section("Due Date") {
            Toggle("Has Due Date", isOn: $hasDueDate)

            if hasDueDate {
                DatePicker(
                    "Due Date",
                    selection: Binding(
                        get: { editDueAt ?? Date() },
                        set: { editDueAt = $0 }
                    ),
                    displayedComponents: [.date, .hourAndMinute]
                )
            }
        }
    }

    // MARK: - Actions

    private func startEditing() {
        editTitle = item.title
        editDetails = item.details ?? ""
        editPriority = item.priority
        editStatus = item.status
        editDueAt = item.dueAt
        hasDueDate = item.dueAt != nil
        isEditing = true
    }

    private func saveChanges() async {
        isSaving = true

        var updates: [String: Any] = [
            "title": editTitle,
            "details": editDetails,
            "priority": editPriority.rawValue,
            "status": editStatus.rawValue
        ]

        if hasDueDate, let dueAt = editDueAt {
            updates["dueAt"] = ISO8601DateFormatter().string(from: dueAt)
        } else {
            updates["dueAt"] = NSNull()
        }

        do {
            item = try await APIClient.shared.updateItem(id: item.id, updates: updates)
            isEditing = false
        } catch {
            self.error = error.localizedDescription
        }

        isSaving = false
    }

    private func toggleComplete() async {
        let newStatus: ItemStatus = item.status == .completed ? .not_started : .completed
        do {
            item = try await APIClient.shared.updateItem(
                id: item.id,
                updates: ["status": newStatus.rawValue]
            )
        } catch {
            self.error = error.localizedDescription
        }
    }
}

#Preview {
    NavigationStack {
        TaskDetailView(item: Item(
            id: "1",
            userId: "user1",
            type: .task,
            title: "Sample Task",
            details: "This is a sample task description.",
            status: .in_progress,
            priority: .high,
            tags: [],
            dueAt: Date().addingTimeInterval(86400),
            projectId: nil,
            courseId: nil,
            energy: nil,
            estimatedMinutes: nil,
            actualMinutes: nil,
            recurrenceRule: nil,
            parentId: nil,
            createdAt: Date(),
            updatedAt: Date()
        ))
    }
}
