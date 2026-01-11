import SwiftUI

struct TaskFormView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var title = ""
    @State private var priority: Priority = .medium
    @State private var hasDueDate = false
    @State private var dueAt = Date()
    @State private var isSaving = false

    let onSave: (String, Priority, Date?) async -> Void

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Task title", text: $title)
                }

                Section {
                    Picker("Priority", selection: $priority) {
                        ForEach([Priority.urgent, .high, .medium, .low], id: \.self) { p in
                            HStack {
                                Circle()
                                    .fill(priorityColor(p))
                                    .frame(width: 8, height: 8)
                                Text(p.rawValue.capitalized)
                            }
                            .tag(p)
                        }
                    }
                }

                Section {
                    Toggle("Set Due Date", isOn: $hasDueDate)

                    if hasDueDate {
                        DatePicker(
                            "Due Date",
                            selection: $dueAt,
                            in: Date()...,
                            displayedComponents: [.date, .hourAndMinute]
                        )
                    }
                }
            }
            .navigationTitle("New Task")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        saveTask()
                    }
                    .disabled(title.isEmpty || isSaving)
                }
            }
        }
    }

    private func priorityColor(_ priority: Priority) -> Color {
        switch priority {
        case .urgent: return .red
        case .high: return .orange
        case .medium: return .blue
        case .low: return .gray
        }
    }

    private func saveTask() {
        isSaving = true
        Task {
            await onSave(title, priority, hasDueDate ? dueAt : nil)
            dismiss()
        }
    }
}

#Preview {
    TaskFormView { title, priority, dueAt in
        print("Created: \(title), \(priority), \(String(describing: dueAt))")
    }
}
