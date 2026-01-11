import SwiftUI

struct StatusBadge: View {
    let status: ItemStatus

    var body: some View {
        HStack(spacing: 4) {
            Circle()
                .fill(statusColor)
                .frame(width: 6, height: 6)

            Text(displayText)
                .font(.caption2)
                .fontWeight(.medium)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(statusColor.opacity(0.1))
        .foregroundStyle(statusColor)
        .clipShape(Capsule())
    }

    private var displayText: String {
        switch status {
        case .not_started:
            return "Not Started"
        case .in_progress:
            return "In Progress"
        case .completed:
            return "Completed"
        case .blocked:
            return "Blocked"
        }
    }

    private var statusColor: Color {
        switch status {
        case .not_started:
            return .gray
        case .in_progress:
            return .blue
        case .completed:
            return .green
        case .blocked:
            return .red
        }
    }
}

#Preview {
    VStack {
        StatusBadge(status: .not_started)
        StatusBadge(status: .in_progress)
        StatusBadge(status: .completed)
        StatusBadge(status: .blocked)
    }
}
