import SwiftUI

struct PriorityBadge: View {
    let priority: Priority

    var body: some View {
        Text(priority.rawValue.capitalized)
            .font(.caption2)
            .fontWeight(.medium)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(backgroundColor)
            .foregroundStyle(foregroundColor)
            .clipShape(Capsule())
    }

    private var backgroundColor: Color {
        switch priority {
        case .urgent:
            return .red.opacity(0.15)
        case .high:
            return .orange.opacity(0.15)
        case .medium:
            return .blue.opacity(0.15)
        case .low:
            return .gray.opacity(0.15)
        }
    }

    private var foregroundColor: Color {
        switch priority {
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

#Preview {
    HStack {
        PriorityBadge(priority: .urgent)
        PriorityBadge(priority: .high)
        PriorityBadge(priority: .medium)
        PriorityBadge(priority: .low)
    }
}
