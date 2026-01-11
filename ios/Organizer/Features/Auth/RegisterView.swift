import SwiftUI

struct RegisterView: View {
    @EnvironmentObject var authManager: AuthManager
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var isLoading = false

    var body: some View {
        ScrollView {
            VStack(spacing: 32) {
                // Header
                VStack(spacing: 12) {
                    Image(systemName: "person.badge.plus.fill")
                        .font(.system(size: 64))
                        .foregroundStyle(.blue)

                    Text("Create Account")
                        .font(.largeTitle)
                        .fontWeight(.bold)

                    Text("Get organized today")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .padding(.top, 20)

                // Form
                VStack(spacing: 16) {
                    TextField("Name (optional)", text: $name)
                        .textContentType(.name)
                        .autocapitalization(.words)
                        .textFieldStyle(.roundedBorder)

                    TextField("Email", text: $email)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)
                        .textFieldStyle(.roundedBorder)

                    SecureField("Password", text: $password)
                        .textContentType(.newPassword)
                        .textFieldStyle(.roundedBorder)

                    SecureField("Confirm Password", text: $confirmPassword)
                        .textContentType(.newPassword)
                        .textFieldStyle(.roundedBorder)

                    if let error = authManager.errorMessage {
                        Text(error)
                            .font(.caption)
                            .foregroundStyle(.red)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    if !passwordsMatch && !confirmPassword.isEmpty {
                        Text("Passwords don't match")
                            .font(.caption)
                            .foregroundStyle(.orange)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    Button(action: register) {
                        HStack {
                            if isLoading {
                                ProgressView()
                                    .tint(.white)
                            } else {
                                Text("Create Account")
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 44)
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(isLoading || !isValidForm)
                }
                .padding(.horizontal)

                // Login Link
                HStack {
                    Text("Already have an account?")
                        .foregroundStyle(.secondary)
                    Button("Sign In") {
                        dismiss()
                    }
                }
                .font(.subheadline)
            }
            .padding()
        }
        .navigationBarTitleDisplayMode(.inline)
    }

    private var passwordsMatch: Bool {
        password == confirmPassword
    }

    private var isValidForm: Bool {
        !email.isEmpty &&
        !password.isEmpty &&
        email.contains("@") &&
        password.count >= 6 &&
        passwordsMatch
    }

    private func register() {
        isLoading = true
        Task {
            do {
                try await authManager.register(
                    email: email,
                    password: password,
                    name: name.isEmpty ? nil : name
                )
            } catch {
                // Error is handled by authManager
            }
            isLoading = false
        }
    }
}

#Preview {
    NavigationStack {
        RegisterView()
            .environmentObject(AuthManager.shared)
    }
}
