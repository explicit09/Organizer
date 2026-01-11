import SwiftUI

struct ScheduleView: View {
    @StateObject private var viewModel = ScheduleViewModel()

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Calendar
                DatePicker(
                    "Select Date",
                    selection: $viewModel.selectedDate,
                    displayedComponents: [.date]
                )
                .datePickerStyle(.graphical)
                .padding(.horizontal)

                Divider()

                // Items for selected date
                if viewModel.isLoading && viewModel.items.isEmpty {
                    LoadingView(message: "Loading schedule...")
                        .frame(maxHeight: .infinity)
                } else if viewModel.itemsForSelectedDate.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "calendar.badge.checkmark")
                            .font(.system(size: 40))
                            .foregroundStyle(.secondary)
                        Text("Nothing scheduled")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    dayItemsList
                }
            }
            .navigationTitle("Schedule")
            .refreshable {
                await viewModel.loadItems()
            }
            .task {
                await viewModel.loadItems()
            }
        }
    }

    private var dayItemsList: some View {
        List {
            Section(viewModel.selectedDate.formatted(date: .complete, time: .omitted)) {
                ForEach(viewModel.itemsForSelectedDate) { item in
                    ScheduleItemRow(item: item) {
                        Task { await viewModel.toggleComplete(item) }
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
    }
}

// MARK: - Schedule Item Row

struct ScheduleItemRow: View {
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
                            Text(dueAt.formatted(date: .omitted, time: .shortened))
                        } icon: {
                            Image(systemName: "clock")
                        }
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    }

                    TypeBadge(type: item.type)
                }
            }

            Spacer()

            PriorityBadge(priority: item.priority)
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Type Badge

struct TypeBadge: View {
    let type: ItemType

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: typeIcon)
                .font(.caption2)
            Text(type.rawValue.capitalized)
                .font(.caption2)
        }
        .padding(.horizontal, 6)
        .padding(.vertical, 2)
        .background(typeColor.opacity(0.1))
        .foregroundStyle(typeColor)
        .clipShape(Capsule())
    }

    private var typeIcon: String {
        switch type {
        case .task: return "checkmark.square"
        case .meeting: return "person.2"
        case .school: return "book"
        }
    }

    private var typeColor: Color {
        switch type {
        case .task: return .blue
        case .meeting: return .purple
        case .school: return .orange
        }
    }
}

#Preview {
    ScheduleView()
}
