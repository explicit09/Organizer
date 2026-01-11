import SwiftUI

struct GoalDetailView: View {
    @Environment(\.dismiss) private var dismiss
    @State var goal: Goal
    @ObservedObject var viewModel: GoalViewModel

    @State private var isEditing = false
    @State private var editTitle = ""
    @State private var editTarget: Double = 0
    @State private var editCurrent: Double = 0
    @State private var editUnit = ""
    @State private var isSaving = false

    var body: some View {
        NavigationStack {
            List {
                // Progress Section
                Section {
                    VStack(spacing: 16) {
                        // Progress Ring
                        ZStack {
                            Circle()
                                .stroke(Color.gray.opacity(0.2), lineWidth: 12)

                            Circle()
                                .trim(from: 0, to: goal.progress)
                                .stroke(progressColor, style: StrokeStyle(lineWidth: 12, lineCap: .round))
                                .rotationEffect(.degrees(-90))
                                .animation(.easeInOut, value: goal.progress)

                            VStack {
                                Text("\(goal.progressPercentage)%")
                                    .font(.title)
                                    .fontWeight(.bold)

                                if let unit = goal.unit {
                                    Text(unit)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }
                        }
                        .frame(width: 120, height: 120)
                        .padding()

                        // Progress details
                        if let target = goal.target, let current = goal.current {
                            HStack {
                                VStack {
                                    Text("\(Int(current))")
                                        .font(.title2)
                                        .fontWeight(.semibold)
                                    Text("Current")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                .frame(maxWidth: .infinity)

                                Divider()

                                VStack {
                                    Text("\(Int(target))")
                                        .font(.title2)
                                        .fontWeight(.semibold)
                                    Text("Target")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                .frame(maxWidth: .infinity)

                                Divider()

                                VStack {
                                    Text("\(Int(target - current))")
                                        .font(.title2)
                                        .fontWeight(.semibold)
                                    Text("Remaining")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                .frame(maxWidth: .infinity)
                            }
                            .padding(.vertical)
                        }
                    }
                }

                // Update Progress
                if goal.status == "active", let target = goal.target {
                    Section("Update Progress") {
                        HStack {
                            Text("Current Value")
                            Spacer()
                            TextField("Value", value: $editCurrent, format: .number)
                                .keyboardType(.decimalPad)
                                .textFieldStyle(.roundedBorder)
                                .frame(width: 100)
                        }

                        Button {
                            Task { await updateProgress() }
                        } label: {
                            HStack {
                                Spacer()
                                if isSaving {
                                    ProgressView()
                                } else {
                                    Text("Update Progress")
                                }
                                Spacer()
                            }
                        }
                        .disabled(isSaving)

                        if editCurrent >= target {
                            Button {
                                Task { await completeGoal() }
                            } label: {
                                HStack {
                                    Spacer()
                                    Label("Mark as Completed", systemImage: "checkmark.circle.fill")
                                    Spacer()
                                }
                            }
                            .tint(.green)
                        }
                    }
                }

                // Details
                Section("Details") {
                    if let area = goal.area {
                        LabeledContent("Area", value: area)
                    }

                    LabeledContent("Status", value: goal.status?.capitalized ?? "Active")

                    if let startDate = goal.startDate {
                        LabeledContent("Start Date") {
                            Text(startDate.formatted(date: .abbreviated, time: .omitted))
                        }
                    }

                    if let endDate = goal.endDate {
                        LabeledContent("End Date") {
                            Text(endDate.formatted(date: .abbreviated, time: .omitted))
                        }
                    }

                    LabeledContent("Created") {
                        Text(goal.createdAt.formatted(date: .abbreviated, time: .shortened))
                    }
                }
            }
            .navigationTitle(goal.title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
            .onAppear {
                editCurrent = goal.current ?? 0
            }
        }
    }

    private var progressColor: Color {
        switch goal.progress {
        case 0..<0.25: return .red
        case 0.25..<0.5: return .orange
        case 0.5..<0.75: return .yellow
        case 0.75..<1.0: return .blue
        default: return .green
        }
    }

    private func updateProgress() async {
        isSaving = true
        if let updatedGoal = await viewModel.updateGoal(
            id: goal.id,
            updates: ["current": editCurrent]
        ) {
            goal = updatedGoal
        }
        isSaving = false
    }

    private func completeGoal() async {
        isSaving = true
        if let updatedGoal = await viewModel.updateGoal(
            id: goal.id,
            updates: ["status": "completed", "current": editCurrent]
        ) {
            goal = updatedGoal
        }
        isSaving = false
        dismiss()
    }
}

#Preview {
    GoalDetailView(
        goal: Goal(
            id: "1",
            userId: "user1",
            title: "Read 12 books",
            target: 12,
            unit: "books",
            current: 7,
            startDate: Date().addingTimeInterval(-86400 * 30),
            endDate: Date().addingTimeInterval(86400 * 60),
            status: "active",
            area: "Learning",
            projectId: nil,
            createdAt: Date(),
            updatedAt: Date()
        ),
        viewModel: GoalViewModel()
    )
}
