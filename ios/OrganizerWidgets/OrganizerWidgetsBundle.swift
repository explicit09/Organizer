import WidgetKit
import SwiftUI

@main
struct OrganizerWidgetsBundle: WidgetBundle {
    var body: some Widget {
        // Home Screen Widgets
        TodayTasksWidget()
        UpcomingWidget()
        StatsWidget()

        // Lock Screen Widgets
        LockScreenTodayWidget()
        LockScreenCircularWidget()
        LockScreenProgressWidget()
        LockScreenRectangularWidget()

        // Interactive Widget (iOS 17+)
        if #available(iOS 17.0, *) {
            QuickAddWidget()
        }
    }
}
