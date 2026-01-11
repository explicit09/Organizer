import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var showLogoutAlert = false

    var body: some View {
        NavigationStack {
            List {
                // Profile Section
                Section {
                    if let user = authManager.currentUser {
                        HStack(spacing: 16) {
                            ZStack {
                                Circle()
                                    .fill(Color.blue.gradient)
                                    .frame(width: 60, height: 60)
                                Text(user.initials)
                                    .font(.title2)
                                    .fontWeight(.semibold)
                                    .foregroundStyle(.white)
                            }

                            VStack(alignment: .leading, spacing: 4) {
                                Text(user.displayName)
                                    .font(.headline)
                                Text(user.email)
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .padding(.vertical, 8)
                    }
                }

                // Account Section
                Section("Account") {
                    NavigationLink {
                        ProfileView()
                    } label: {
                        Label("Edit Profile", systemImage: "person.circle")
                    }

                    NavigationLink {
                        NotificationsSettingsView()
                    } label: {
                        Label("Notifications", systemImage: "bell")
                    }
                }

                // Preferences Section
                Section("Preferences") {
                    NavigationLink {
                        AppearanceSettingsView()
                    } label: {
                        Label("Appearance", systemImage: "paintbrush")
                    }

                    NavigationLink {
                        Text("Default Priority Settings")
                    } label: {
                        Label("Defaults", systemImage: "slider.horizontal.3")
                    }
                }

                // Support Section
                Section("Support") {
                    Link(destination: URL(string: "https://example.com/help")!) {
                        Label("Help Center", systemImage: "questionmark.circle")
                    }

                    Link(destination: URL(string: "mailto:support@example.com")!) {
                        Label("Contact Support", systemImage: "envelope")
                    }
                }

                // About Section
                Section("About") {
                    LabeledContent("Version") {
                        Text(Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0")
                    }

                    LabeledContent("Build") {
                        Text(Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "1")
                    }
                }

                // Logout Section
                Section {
                    Button(role: .destructive) {
                        showLogoutAlert = true
                    } label: {
                        Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
                    }
                }
            }
            .navigationTitle("Settings")
            .alert("Sign Out", isPresented: $showLogoutAlert) {
                Button("Cancel", role: .cancel) {}
                Button("Sign Out", role: .destructive) {
                    Task { await authManager.logout() }
                }
            } message: {
                Text("Are you sure you want to sign out?")
            }
        }
    }
}

// MARK: - Profile View

struct ProfileView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var name = ""
    @State private var isSaving = false

    var body: some View {
        Form {
            Section {
                if let user = authManager.currentUser {
                    LabeledContent("Email", value: user.email)
                }

                TextField("Name", text: $name)
            }

            Section {
                Button("Save Changes") {
                    // Save logic would go here
                }
                .disabled(isSaving)
            }
        }
        .navigationTitle("Edit Profile")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            name = authManager.currentUser?.name ?? ""
        }
    }
}

// MARK: - Notifications Settings

struct NotificationsSettingsView: View {
    @AppStorage("notifications_enabled") private var notificationsEnabled = true
    @AppStorage("notifications_due_reminders") private var dueReminders = true
    @AppStorage("notifications_daily_summary") private var dailySummary = false

    var body: some View {
        Form {
            Section {
                Toggle("Enable Notifications", isOn: $notificationsEnabled)
            }

            Section("Reminders") {
                Toggle("Due Date Reminders", isOn: $dueReminders)
                    .disabled(!notificationsEnabled)

                Toggle("Daily Summary", isOn: $dailySummary)
                    .disabled(!notificationsEnabled)
            }
        }
        .navigationTitle("Notifications")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Appearance Settings

struct AppearanceSettingsView: View {
    @AppStorage("appearance_mode") private var appearanceMode = 0 // 0: system, 1: light, 2: dark

    var body: some View {
        Form {
            Section("Theme") {
                Picker("Appearance", selection: $appearanceMode) {
                    Text("System").tag(0)
                    Text("Light").tag(1)
                    Text("Dark").tag(2)
                }
                .pickerStyle(.inline)
            }
        }
        .navigationTitle("Appearance")
        .navigationBarTitleDisplayMode(.inline)
    }
}

#Preview {
    SettingsView()
        .environmentObject(AuthManager.shared)
}
