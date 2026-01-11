import SwiftUI

struct ProjectFormView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var area = ""
    @State private var goal = ""
    @State private var isSaving = false

    let onSave: (String, String?, String?) async -> Void

    private let areas = ["Work", "Personal", "Health", "Learning", "Finance", "Other"]

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Project name", text: $name)
                }

                Section("Area") {
                    Picker("Area", selection: $area) {
                        Text("None").tag("")
                        ForEach(areas, id: \.self) { area in
                            Text(area).tag(area)
                        }
                    }
                    .pickerStyle(.menu)
                }

                Section("Goal") {
                    TextField("What do you want to achieve?", text: $goal, axis: .vertical)
                        .lineLimit(2...4)
                }
            }
            .navigationTitle("New Project")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Create") {
                        saveProject()
                    }
                    .disabled(name.isEmpty || isSaving)
                }
            }
        }
    }

    private func saveProject() {
        isSaving = true
        Task {
            await onSave(
                name,
                area.isEmpty ? nil : area,
                goal.isEmpty ? nil : goal
            )
            dismiss()
        }
    }
}

#Preview {
    ProjectFormView { name, area, goal in
        print("Created: \(name), \(area ?? "nil"), \(goal ?? "nil")")
    }
}
