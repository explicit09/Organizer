import SwiftUI

struct GoalListView: View {
    @StateObject private var viewModel = GoalViewModel()
    @State private var showAddGoal = false
    @State private var selectedGoal: Goal?

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.goals.isEmpty {
                    LoadingView(message: "Loading goals...")
                } else if let error = viewModel.error, viewModel.goals.isEmpty {
                    ErrorView(message: error) {
                        Task { await viewModel.loadGoals() }
                    }
                } else if viewModel.filteredGoals.isEmpty {
                    EmptyState(
                        icon: "target",
                        title: "No Goals",
                        description: "Set goals to track your progress and stay motivated.",
                        actionTitle: "Add Goal"
                    ) {
                        showAddGoal = true
                    }
                } else {
                    goalsList
                }
            }
            .navigationTitle("Goals")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    filterMenu
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showAddGoal = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .refreshable {
                await viewModel.loadGoals()
            }
            .task {
                await viewModel.loadGoals()
            }
            .sheet(isPresented: $showAddGoal) {
                GoalFormView { title, target, unit in
                    await viewModel.createGoal(title: title, target: target, unit: unit)
                }
            }
            .sheet(item: $selectedGoal) { goal in
                GoalDetailView(goal: goal, viewModel: viewModel)
            }
        }
    }

    private var goalsList: some View {
        List {
            if !viewModel.activeGoals.isEmpty && viewModel.filterStatus != "completed" {
                Section("Active") {
                    ForEach(viewModel.activeGoals) { goal in
                        GoalRow(goal: goal)
                            .contentShape(Rectangle())
                            .onTapGesture {
                                selectedGoal = goal
                            }
                    }
                }
            }

            if !viewModel.completedGoals.isEmpty && viewModel.filterStatus != "active" {
                Section("Completed") {
                    ForEach(viewModel.completedGoals) { goal in
                        GoalRow(goal: goal)
                            .contentShape(Rectangle())
                            .onTapGesture {
                                selectedGoal = goal
                            }
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
    }

    private var filterMenu: some View {
        Menu {
            Button {
                viewModel.filterStatus = nil
            } label: {
                Label("All", systemImage: viewModel.filterStatus == nil ? "checkmark" : "")
            }
            Button {
                viewModel.filterStatus = "active"
            } label: {
                Label("Active", systemImage: viewModel.filterStatus == "active" ? "checkmark" : "")
            }
            Button {
                viewModel.filterStatus = "completed"
            } label: {
                Label("Completed", systemImage: viewModel.filterStatus == "completed" ? "checkmark" : "")
            }
        } label: {
            Image(systemName: viewModel.filterStatus != nil ? "line.3.horizontal.decrease.circle.fill" : "line.3.horizontal.decrease.circle")
        }
    }
}

// MARK: - Goal Row

struct GoalRow: View {
    let goal: Goal

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(goal.title)
                    .font(.headline)

                Spacer()

                if goal.status == "completed" {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(.green)
                }
            }

            // Progress bar
            if let target = goal.target, target > 0 {
                VStack(alignment: .leading, spacing: 4) {
                    ProgressView(value: goal.progress)
                        .tint(progressColor)

                    HStack {
                        if let current = goal.current, let unit = goal.unit {
                            Text("\(Int(current)) / \(Int(target)) \(unit)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }

                        Spacer()

                        Text("\(goal.progressPercentage)%")
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundStyle(progressColor)
                    }
                }
            }

            // Due date
            if let endDate = goal.endDate {
                HStack {
                    Image(systemName: "calendar")
                        .font(.caption)
                    Text("Due \(endDate.formatted(date: .abbreviated, time: .omitted))")
                        .font(.caption)
                }
                .foregroundStyle(endDate < Date() && goal.status != "completed" ? .red : .secondary)
            }
        }
        .padding(.vertical, 4)
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
}

#Preview {
    GoalListView()
}
