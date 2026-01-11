import SwiftUI

struct DashboardView: View {
    @EnvironmentObject var authManager: AuthManager
    @StateObject private var viewModel = DashboardViewModel()

    var body: some View {
        NavigationStack {
            ScrollView {
                if viewModel.isLoading {
                    LoadingView(message: "Loading dashboard...")
                        .frame(height: 300)
                } else if let error = viewModel.error {
                    ErrorView(message: error) {
                        Task { await viewModel.loadData() }
                    }
                    .frame(height: 300)
                } else {
                    VStack(spacing: 24) {
                        // Greeting
                        GreetingHeader(userName: authManager.currentUser?.displayName ?? "User")

                        // Stats Cards
                        StatsSection(
                            dueToday: viewModel.dueToday.count,
                            inProgress: viewModel.inProgress.count,
                            overdue: viewModel.overdue.count,
                            completedThisWeek: viewModel.completedThisWeek
                        )

                        // Upcoming Items
                        if !viewModel.upcoming.isEmpty {
                            UpcomingSection(items: viewModel.upcoming)
                        }

                        // Quick Actions
                        QuickActionsSection()
                    }
                    .padding()
                }
            }
            .navigationTitle("Home")
            .refreshable {
                await viewModel.loadData()
            }
            .task {
                await viewModel.loadData()
            }
        }
    }
}

// MARK: - Greeting Header

struct GreetingHeader: View {
    let userName: String

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(greeting)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Text(userName)
                    .font(.title)
                    .fontWeight(.bold)
            }
            Spacer()
        }
    }

    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: Date())
        switch hour {
        case 0..<12:
            return "Good morning,"
        case 12..<17:
            return "Good afternoon,"
        default:
            return "Good evening,"
        }
    }
}

// MARK: - Stats Section

struct StatsSection: View {
    let dueToday: Int
    let inProgress: Int
    let overdue: Int
    let completedThisWeek: Int

    var body: some View {
        LazyVGrid(columns: [
            GridItem(.flexible()),
            GridItem(.flexible())
        ], spacing: 12) {
            StatsCard(
                title: "Due Today",
                value: dueToday,
                icon: "calendar",
                color: .blue
            )
            StatsCard(
                title: "In Progress",
                value: inProgress,
                icon: "arrow.triangle.2.circlepath",
                color: .orange
            )
            StatsCard(
                title: "Overdue",
                value: overdue,
                icon: "exclamationmark.triangle",
                color: overdue > 0 ? .red : .gray
            )
            StatsCard(
                title: "Done This Week",
                value: completedThisWeek,
                icon: "checkmark.circle",
                color: .green
            )
        }
    }
}

struct StatsCard: View {
    let title: String
    let value: Int
    let icon: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: icon)
                    .foregroundStyle(color)
                Spacer()
            }

            Text("\(value)")
                .font(.title)
                .fontWeight(.bold)

            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding()
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

// MARK: - Upcoming Section

struct UpcomingSection: View {
    let items: [Item]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Upcoming")
                .font(.headline)

            ForEach(items) { item in
                UpcomingItemRow(item: item)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct UpcomingItemRow: View {
    let item: Item

    var body: some View {
        HStack(spacing: 12) {
            Circle()
                .fill(priorityColor)
                .frame(width: 8, height: 8)

            VStack(alignment: .leading, spacing: 2) {
                Text(item.title)
                    .font(.subheadline)
                    .lineLimit(1)

                if let dueAt = item.dueAt {
                    Text(dueAt.formatted(date: .abbreviated, time: .shortened))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()

            PriorityBadge(priority: item.priority)
        }
        .padding(.vertical, 8)
        .padding(.horizontal, 12)
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private var priorityColor: Color {
        switch item.priority {
        case .urgent:
            return .red
        case .high:
            return .orange
        case .medium:
            return .blue
        case .low:
            return .gray
        }
    }
}

// MARK: - Quick Actions

struct QuickActionsSection: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Quick Actions")
                .font(.headline)

            HStack(spacing: 12) {
                QuickActionButton(
                    title: "Add Task",
                    icon: "plus.circle.fill",
                    color: .blue
                ) {
                    // Action handled by parent
                }

                QuickActionButton(
                    title: "Add Note",
                    icon: "note.text.badge.plus",
                    color: .orange
                ) {
                    // Action handled by parent
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct QuickActionButton: View {
    let title: String
    let icon: String
    let color: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                Image(systemName: icon)
                    .font(.title3)
                Text(title)
                    .fontWeight(.medium)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 44)
        }
        .buttonStyle(.bordered)
        .tint(color)
    }
}

#Preview {
    DashboardView()
        .environmentObject(AuthManager.shared)
}
