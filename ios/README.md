# Organizer iOS App

A complete native SwiftUI iOS app that connects to the Organizer backend API. Features full offline support, push notifications, and a polished native UI.

## Requirements

- Xcode 15.0+
- iOS 17.0+
- macOS Sonoma 14.0+ (for development)

## Features

### Core Features
- **Authentication**: Login/register with email & password, session persistence
- **Dashboard**: Stats cards, upcoming items, quick actions
- **Tasks**: Full CRUD, filters, swipe actions, priorities, due dates
- **Projects**: Organize tasks into projects with status tracking
- **Schedule**: Calendar view with daily items
- **Notes**: Create, edit, delete notes with rich text
- **Goals**: Track progress with visual indicators
- **Global Search**: Search across all content types

### Technical Features
- **Offline Support**: SwiftData persistence with sync queue
- **Push Notifications**: Local reminders and daily summaries
- **Network Monitoring**: Automatic sync when coming back online
- **MVVM Architecture**: Clean separation of concerns

## Setup Instructions

### 1. Create Xcode Project

1. Open Xcode
2. Select **File > New > Project**
3. Choose **iOS > App**
4. Configure:
   - Product Name: `Organizer`
   - Team: Your Apple Developer Team
   - Organization Identifier: `com.yourcompany`
   - Interface: **SwiftUI**
   - Language: **Swift**
   - Storage: **SwiftData**
5. Save to this `ios` directory

### 2. Add Source Files

1. In Xcode's Project Navigator, delete the auto-generated files (except Assets)
2. Right-click on the project > **Add Files to "Organizer"...**
3. Select all folders:
   - `App/`
   - `Core/`
   - `Features/`
   - `Shared/`
4. Ensure **"Copy items if needed"** is **unchecked**
5. Click **Add**

### 3. Configure Info.plist

Add these entries:

```xml
<!-- Allow local network access for development -->
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsLocalNetworking</key>
    <true/>
</dict>

<!-- Face ID usage (if implementing biometric auth) -->
<key>NSFaceIDUsageDescription</key>
<string>Use Face ID to quickly access your tasks</string>
```

### 4. Update API Configuration

In `Core/Network/APIClient.swift`, update the URLs:

```swift
#if DEBUG
private let baseURL = URL(string: "http://localhost:3000")!
#else
private let baseURL = URL(string: "https://your-production-url.com")!
#endif
```

### 5. Run the App

1. Select an iOS Simulator (iPhone 15 Pro recommended)
2. Ensure backend is running at `localhost:3000`
3. Press **Cmd + R** to build and run

## Project Structure

```
Organizer/
├── App/
│   ├── OrganizerApp.swift          # App entry, SwiftData, delegates
│   └── ContentView.swift           # Root navigation & tab bar
├── Core/
│   ├── Models/                     # SwiftData models
│   │   ├── Item.swift              # Tasks, meetings, school items
│   │   ├── User.swift              # User model
│   │   ├── Project.swift           # Projects
│   │   ├── Course.swift            # Courses
│   │   ├── Note.swift              # Notes
│   │   └── Goal.swift              # Goals
│   ├── Network/                    # API layer
│   │   ├── APIClient.swift         # URLSession wrapper
│   │   ├── APIEndpoints.swift      # Endpoint definitions
│   │   └── AuthManager.swift       # Session management
│   └── Services/                   # App services
│       ├── SyncService.swift       # Offline sync
│       └── NotificationService.swift # Push notifications
├── Features/
│   ├── Auth/                       # Login & registration
│   │   ├── LoginView.swift
│   │   └── RegisterView.swift
│   ├── Dashboard/                  # Home screen
│   │   ├── DashboardView.swift
│   │   └── DashboardViewModel.swift
│   ├── Tasks/                      # Task management
│   │   ├── TaskListView.swift
│   │   ├── TaskDetailView.swift
│   │   ├── TaskFormView.swift
│   │   └── TaskViewModel.swift
│   ├── Projects/                   # Project management
│   │   ├── ProjectListView.swift
│   │   ├── ProjectDetailView.swift
│   │   ├── ProjectFormView.swift
│   │   └── ProjectViewModel.swift
│   ├── Schedule/                   # Calendar
│   │   ├── ScheduleView.swift
│   │   └── ScheduleViewModel.swift
│   ├── Notes/                      # Notes
│   │   ├── NoteListView.swift
│   │   ├── NoteEditorView.swift
│   │   └── NoteViewModel.swift
│   ├── Goals/                      # Goals
│   │   ├── GoalListView.swift
│   │   ├── GoalDetailView.swift
│   │   ├── GoalFormView.swift
│   │   └── GoalViewModel.swift
│   ├── Search/                     # Global search
│   │   ├── SearchView.swift
│   │   └── SearchViewModel.swift
│   └── Settings/                   # Settings
│       └── SettingsView.swift
└── Shared/
    ├── Components/                 # Reusable UI
    │   ├── LoadingView.swift
    │   ├── ErrorView.swift
    │   ├── EmptyState.swift
    │   ├── PriorityBadge.swift
    │   └── StatusBadge.swift
    ├── Extensions/                 # Swift extensions
    │   ├── Date+Extensions.swift
    │   └── Color+Extensions.swift
    └── Theme/                      # App styling
        └── AppTheme.swift
```

## API Endpoints

| Feature | Endpoints |
|---------|-----------|
| **Auth** | `POST /api/auth/login`, `POST /api/auth/register`, `GET /api/auth/me`, `POST /api/auth/logout` |
| **Items** | `GET /api/items`, `POST /api/items`, `GET /api/items/:id`, `PATCH /api/items/:id`, `DELETE /api/items/:id` |
| **Subtasks** | `GET /api/items/:id/subtasks`, `POST /api/items/:id/subtasks` |
| **Projects** | `GET /api/projects`, `POST /api/projects`, `GET /api/projects/:id` |
| **Notes** | `GET /api/notes`, `POST /api/notes`, `PATCH /api/notes/:id`, `DELETE /api/notes/:id` |
| **Goals** | `GET /api/goals`, `POST /api/goals`, `PATCH /api/goals/:id` |
| **Search** | `GET /api/search?q=query` |
| **Analytics** | `GET /api/analytics` |

## Architecture

### MVVM Pattern
- **Views**: SwiftUI views for UI
- **ViewModels**: ObservableObject classes managing state
- **Models**: SwiftData @Model classes for persistence

### Networking
- Cookie-based session authentication
- Automatic session persistence via URLSession
- ISO8601 date formatting for API communication

### Offline Support
- SwiftData for local persistence
- `needsSync` flag on models tracks pending changes
- SyncService monitors network and syncs when online

### Notifications
- UNUserNotificationCenter for local notifications
- Notification categories with actions (Complete, Snooze)
- Daily summary reminders

## Development

### Running Tests
```bash
# In Xcode: Cmd + U
# Or from command line:
xcodebuild test -scheme Organizer -destination 'platform=iOS Simulator,name=iPhone 15 Pro'
```

### Building for Release
1. Update version/build numbers in project settings
2. Select "Any iOS Device" as destination
3. **Product > Archive**
4. Upload to App Store Connect

## Troubleshooting

### "Cannot connect to server"
- Ensure backend runs at `http://localhost:3000`
- Verify `NSAllowsLocalNetworking` is in Info.plist
- Test API: `curl http://localhost:3000/api/auth/me`

### "Invalid response"
- Check backend logs for errors
- Verify API response format matches DTOs
- Use Xcode's Network Debugger

### Build errors
- **Clean Build Folder**: Cmd + Shift + K
- **Delete Derived Data**: `rm -rf ~/Library/Developer/Xcode/DerivedData`
- **Reset Package Cache**: **File > Packages > Reset Package Caches**

### SwiftData errors
- Delete app from simulator to reset database
- Check model schema matches initialization

## File Count Summary

| Category | Files |
|----------|-------|
| App | 2 |
| Models | 6 |
| Network | 3 |
| Services | 2 |
| Features | 22 |
| Shared | 8 |
| **Total** | **43 Swift files** |
