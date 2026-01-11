import Foundation

extension Date {
    var isToday: Bool {
        Calendar.current.isDateInToday(self)
    }

    var isTomorrow: Bool {
        Calendar.current.isDateInTomorrow(self)
    }

    var isOverdue: Bool {
        self < Date() && !isToday
    }

    var isThisWeek: Bool {
        Calendar.current.isDate(self, equalTo: Date(), toGranularity: .weekOfYear)
    }

    var relativeDescription: String {
        if isToday {
            return "Today"
        } else if isTomorrow {
            return "Tomorrow"
        } else if isOverdue {
            return "Overdue"
        } else if isThisWeek {
            let formatter = DateFormatter()
            formatter.dateFormat = "EEEE" // Day name
            return formatter.string(from: self)
        } else {
            return formatted(date: .abbreviated, time: .omitted)
        }
    }

    var timeDescription: String {
        formatted(date: .omitted, time: .shortened)
    }

    static func startOfWeek(for date: Date = Date()) -> Date {
        let calendar = Calendar.current
        return calendar.date(from: calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: date))!
    }

    static func endOfWeek(for date: Date = Date()) -> Date {
        let calendar = Calendar.current
        let startOfWeek = startOfWeek(for: date)
        return calendar.date(byAdding: .day, value: 6, to: startOfWeek)!
    }
}
