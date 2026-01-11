import SwiftUI

struct GoalFormView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var title = ""
    @State private var hasTarget = false
    @State private var target: Double = 10
    @State private var unit = ""
    @State private var isSaving = false

    let onSave: (String, Double?, String?) async -> Goal?

    private let commonUnits = ["pages", "books", "miles", "km", "hours", "days", "tasks", "items", "sessions"]

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Goal title", text: $title)
                        .textInputAutocapitalization(.sentences)
                }

                Section {
                    Toggle("Set Target", isOn: $hasTarget)

                    if hasTarget {
                        HStack {
                            Text("Target")
                            Spacer()
                            TextField("Value", value: $target, format: .number)
                                .keyboardType(.decimalPad)
                                .textFieldStyle(.roundedBorder)
                                .frame(width: 100)
                        }

                        VStack(alignment: .leading, spacing: 8) {
                            TextField("Unit (e.g., books, miles)", text: $unit)

                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 8) {
                                    ForEach(commonUnits, id: \.self) { suggestion in
                                        Button(suggestion) {
                                            unit = suggestion
                                        }
                                        .buttonStyle(.bordered)
                                        .tint(unit == suggestion ? .blue : .gray)
                                        .controlSize(.small)
                                    }
                                }
                            }
                        }
                    }
                } footer: {
                    if hasTarget {
                        Text("Example: Read 12 books, Run 100 miles")
                    }
                }
            }
            .navigationTitle("New Goal")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Create") {
                        Task { await createGoal() }
                    }
                    .disabled(title.isEmpty || isSaving)
                }
            }
        }
    }

    private func createGoal() async {
        isSaving = true
        _ = await onSave(
            title,
            hasTarget ? target : nil,
            hasTarget && !unit.isEmpty ? unit : nil
        )
        isSaving = false
        dismiss()
    }
}

#Preview {
    GoalFormView { title, target, unit in
        print("Created: \(title), \(String(describing: target)), \(String(describing: unit))")
        return nil
    }
}
