import Foundation
import SwiftData
import Network

/// Service responsible for syncing local data with the server
/// Handles offline support and conflict resolution
@MainActor
class SyncService: ObservableObject {
    static let shared = SyncService()

    @Published var isSyncing = false
    @Published var lastSyncDate: Date?
    @Published var isOnline = true
    @Published var pendingSyncCount = 0

    private let monitor = NWPathMonitor()
    private let monitorQueue = DispatchQueue(label: "NetworkMonitor")

    private init() {
        setupNetworkMonitoring()
        loadLastSyncDate()
    }

    // MARK: - Network Monitoring

    private func setupNetworkMonitoring() {
        monitor.pathUpdateHandler = { [weak self] path in
            Task { @MainActor in
                self?.isOnline = path.status == .satisfied
                if path.status == .satisfied {
                    // Auto-sync when coming back online
                    await self?.syncPendingChanges()
                }
            }
        }
        monitor.start(queue: monitorQueue)
    }

    // MARK: - Sync Operations

    /// Sync all pending changes to the server
    func syncPendingChanges() async {
        guard isOnline else { return }
        guard !isSyncing else { return }

        isSyncing = true

        // Sync items
        await syncItems()

        // Sync notes
        await syncNotes()

        // Sync goals
        await syncGoals()

        lastSyncDate = Date()
        saveLastSyncDate()
        isSyncing = false
    }

    /// Full sync - fetch all data from server
    func fullSync(modelContext: ModelContext) async {
        guard isOnline else { return }
        guard !isSyncing else { return }

        isSyncing = true

        do {
            // Fetch and update items
            let items = try await APIClient.shared.fetchItems(type: nil, status: nil)
            for item in items {
                modelContext.insert(item)
            }

            // Fetch and update notes
            let notes = try await APIClient.shared.fetchNotes()
            for note in notes {
                modelContext.insert(note)
            }

            // Fetch and update goals
            let goals = try await APIClient.shared.fetchGoals()
            for goal in goals {
                modelContext.insert(goal)
            }

            // Fetch and update projects
            let projects = try await APIClient.shared.fetchProjects()
            for project in projects {
                modelContext.insert(project)
            }

            try modelContext.save()

            lastSyncDate = Date()
            saveLastSyncDate()
        } catch {
            print("Full sync error: \(error)")
        }

        isSyncing = false
    }

    // MARK: - Individual Sync Methods

    private func syncItems() async {
        // In a real implementation, this would:
        // 1. Fetch items with needsSync = true from SwiftData
        // 2. Push changes to server
        // 3. Handle conflicts
        // 4. Update needsSync = false
    }

    private func syncNotes() async {
        // Similar to syncItems
    }

    private func syncGoals() async {
        // Similar to syncItems
    }

    // MARK: - Persistence

    private func loadLastSyncDate() {
        if let timestamp = UserDefaults.standard.object(forKey: "lastSyncDate") as? Date {
            lastSyncDate = timestamp
        }
    }

    private func saveLastSyncDate() {
        UserDefaults.standard.set(lastSyncDate, forKey: "lastSyncDate")
    }

    // MARK: - Offline Queue

    /// Queue an operation to be executed when online
    func queueOfflineOperation(_ operation: @escaping () async -> Void) {
        // Store operation for later execution
        // In production, this would serialize operations to disk
        pendingSyncCount += 1

        if isOnline {
            Task {
                await operation()
                pendingSyncCount -= 1
            }
        }
    }
}

// MARK: - Sync Status View

import SwiftUI

struct SyncStatusView: View {
    @ObservedObject var syncService = SyncService.shared

    var body: some View {
        HStack(spacing: 8) {
            if syncService.isSyncing {
                ProgressView()
                    .scaleEffect(0.7)
                Text("Syncing...")
            } else if !syncService.isOnline {
                Image(systemName: "wifi.slash")
                    .foregroundStyle(.orange)
                Text("Offline")
            } else if syncService.pendingSyncCount > 0 {
                Image(systemName: "arrow.triangle.2.circlepath")
                    .foregroundStyle(.blue)
                Text("\(syncService.pendingSyncCount) pending")
            } else if let lastSync = syncService.lastSyncDate {
                Image(systemName: "checkmark.circle")
                    .foregroundStyle(.green)
                Text("Synced \(lastSync.formatted(.relative(presentation: .named)))")
            }
        }
        .font(.caption)
        .foregroundStyle(.secondary)
    }
}
