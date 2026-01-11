import SwiftUI

struct ContentView: View {
    @EnvironmentObject var authManager: AuthManager

    var body: some View {
        Group {
            if authManager.isLoading {
                LoadingView()
            } else if authManager.isAuthenticated {
                MainTabView()
            } else {
                LoginView()
            }
        }
        .task {
            await authManager.checkAuth()
        }
    }
}

struct MainTabView: View {
    @State private var showSearch = false

    var body: some View {
        TabView {
            DashboardView()
                .tabItem {
                    Label("Home", systemImage: "house.fill")
                }

            TaskListView()
                .tabItem {
                    Label("Tasks", systemImage: "checklist")
                }

            ScheduleView()
                .tabItem {
                    Label("Schedule", systemImage: "calendar")
                }

            ProjectListView()
                .tabItem {
                    Label("Projects", systemImage: "folder.fill")
                }

            MoreView()
                .tabItem {
                    Label("More", systemImage: "ellipsis.circle.fill")
                }
        }
        .tint(.primary)
        .sheet(isPresented: $showSearch) {
            SearchView()
        }
    }
}

// MARK: - More View (contains Notes, Goals, Settings)

struct MoreView: View {
    var body: some View {
        NavigationStack {
            List {
                Section("Features") {
                    NavigationLink {
                        NoteListView()
                    } label: {
                        Label("Notes", systemImage: "note.text")
                    }

                    NavigationLink {
                        GoalListView()
                    } label: {
                        Label("Goals", systemImage: "target")
                    }
                }

                Section("Tools") {
                    NavigationLink {
                        SearchView()
                    } label: {
                        Label("Search", systemImage: "magnifyingglass")
                    }
                }

                Section {
                    NavigationLink {
                        SettingsView()
                    } label: {
                        Label("Settings", systemImage: "gearshape")
                    }
                }
            }
            .navigationTitle("More")
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(AuthManager.shared)
}
