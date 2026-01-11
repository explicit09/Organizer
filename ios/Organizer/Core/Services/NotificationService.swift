import Foundation
import UserNotifications
import SwiftUI

/// Service responsible for managing local and push notifications
@MainActor
class NotificationService: ObservableObject {
    static let shared = NotificationService()

    @Published var isAuthorized = false
    @Published var pendingNotifications: [UNNotificationRequest] = []

    private let notificationCenter = UNUserNotificationCenter.current()

    private init() {
        Task {
            await checkAuthorizationStatus()
        }
    }

    // MARK: - Authorization

    /// Request notification permissions
    func requestAuthorization() async -> Bool {
        do {
            let granted = try await notificationCenter.requestAuthorization(options: [.alert, .badge, .sound])
            isAuthorized = granted
            return granted
        } catch {
            print("Notification authorization error: \(error)")
            return false
        }
    }

    /// Check current authorization status
    func checkAuthorizationStatus() async {
        let settings = await notificationCenter.notificationSettings()
        isAuthorized = settings.authorizationStatus == .authorized
    }

    // MARK: - Local Notifications

    /// Schedule a reminder notification for an item
    func scheduleItemReminder(item: Item, at date: Date) async {
        guard isAuthorized else {
            _ = await requestAuthorization()
            guard isAuthorized else { return }
        }

        let content = UNMutableNotificationContent()
        content.title = "Reminder"
        content.body = item.title
        content.sound = .default
        content.badge = 1
        content.userInfo = ["itemId": item.id]

        // Add category for actions
        content.categoryIdentifier = "ITEM_REMINDER"

        let triggerDate = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: date)
        let trigger = UNCalendarNotificationTrigger(dateMatching: triggerDate, repeats: false)

        let request = UNNotificationRequest(
            identifier: "item-\(item.id)",
            content: content,
            trigger: trigger
        )

        do {
            try await notificationCenter.add(request)
            await refreshPendingNotifications()
        } catch {
            print("Failed to schedule notification: \(error)")
        }
    }

    /// Schedule notifications for all items due today
    func scheduleDueTodayReminders(items: [Item]) async {
        let todayItems = items.filter { item in
            guard let dueAt = item.dueAt else { return false }
            return Calendar.current.isDateInToday(dueAt) && item.status != .completed
        }

        for item in todayItems {
            if let dueAt = item.dueAt {
                // Remind 30 minutes before
                let reminderDate = dueAt.addingTimeInterval(-30 * 60)
                if reminderDate > Date() {
                    await scheduleItemReminder(item: item, at: reminderDate)
                }
            }
        }
    }

    /// Schedule a daily summary notification
    func scheduleDailySummary(at hour: Int, minute: Int) async {
        guard isAuthorized else { return }

        let content = UNMutableNotificationContent()
        content.title = "Daily Summary"
        content.body = "Check your tasks for today"
        content.sound = .default
        content.categoryIdentifier = "DAILY_SUMMARY"

        var dateComponents = DateComponents()
        dateComponents.hour = hour
        dateComponents.minute = minute

        let trigger = UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: true)

        let request = UNNotificationRequest(
            identifier: "daily-summary",
            content: content,
            trigger: trigger
        )

        do {
            try await notificationCenter.add(request)
        } catch {
            print("Failed to schedule daily summary: \(error)")
        }
    }

    // MARK: - Cancel Notifications

    /// Cancel a specific notification
    func cancelNotification(identifier: String) {
        notificationCenter.removePendingNotificationRequests(withIdentifiers: [identifier])
        Task {
            await refreshPendingNotifications()
        }
    }

    /// Cancel notification for a specific item
    func cancelItemNotification(itemId: String) {
        cancelNotification(identifier: "item-\(itemId)")
    }

    /// Cancel all pending notifications
    func cancelAllNotifications() {
        notificationCenter.removeAllPendingNotificationRequests()
        pendingNotifications = []
    }

    // MARK: - Badge Management

    /// Update the app badge count
    func updateBadgeCount(_ count: Int) async {
        do {
            try await notificationCenter.setBadgeCount(count)
        } catch {
            print("Failed to update badge: \(error)")
        }
    }

    /// Clear the app badge
    func clearBadge() async {
        await updateBadgeCount(0)
    }

    // MARK: - Private Helpers

    private func refreshPendingNotifications() async {
        pendingNotifications = await notificationCenter.pendingNotificationRequests()
    }

    // MARK: - Notification Categories

    /// Setup notification action categories
    func setupNotificationCategories() {
        // Item reminder actions
        let completeAction = UNNotificationAction(
            identifier: "COMPLETE_ITEM",
            title: "Mark Complete",
            options: []
        )

        let snoozeAction = UNNotificationAction(
            identifier: "SNOOZE_ITEM",
            title: "Snooze 1 Hour",
            options: []
        )

        let itemCategory = UNNotificationCategory(
            identifier: "ITEM_REMINDER",
            actions: [completeAction, snoozeAction],
            intentIdentifiers: [],
            options: []
        )

        // Daily summary actions
        let viewAction = UNNotificationAction(
            identifier: "VIEW_TASKS",
            title: "View Tasks",
            options: [.foreground]
        )

        let summaryCategory = UNNotificationCategory(
            identifier: "DAILY_SUMMARY",
            actions: [viewAction],
            intentIdentifiers: [],
            options: []
        )

        notificationCenter.setNotificationCategories([itemCategory, summaryCategory])
    }
}

// MARK: - Notification Delegate

class NotificationDelegate: NSObject, UNUserNotificationCenterDelegate {
    static let shared = NotificationDelegate()

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        // Show notification even when app is in foreground
        completionHandler([.banner, .sound, .badge])
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let userInfo = response.notification.request.content.userInfo

        switch response.actionIdentifier {
        case "COMPLETE_ITEM":
            if let itemId = userInfo["itemId"] as? String {
                // Mark item as complete
                Task {
                    try? await APIClient.shared.updateItem(
                        id: itemId,
                        updates: ["status": ItemStatus.completed.rawValue]
                    )
                }
            }

        case "SNOOZE_ITEM":
            if let itemId = userInfo["itemId"] as? String {
                // Reschedule notification for 1 hour later
                // In production, would need to fetch the item and reschedule
                print("Snooze item: \(itemId)")
            }

        case "VIEW_TASKS":
            // Navigate to tasks view
            // This would post a notification that the app observes
            NotificationCenter.default.post(name: .navigateToTasks, object: nil)

        default:
            break
        }

        completionHandler()
    }
}

// MARK: - Notification Names

extension Notification.Name {
    static let navigateToTasks = Notification.Name("navigateToTasks")
    static let navigateToItem = Notification.Name("navigateToItem")
}
