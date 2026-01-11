import SwiftUI

struct SearchView: View {
    @StateObject private var viewModel = SearchViewModel()
    @Environment(\.dismiss) private var dismiss
    @FocusState private var isSearchFocused: Bool

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Search bar
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundStyle(.secondary)

                    TextField("Search tasks, projects, notes...", text: $viewModel.searchText)
                        .textFieldStyle(.plain)
                        .focused($isSearchFocused)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)
                        .submitLabel(.search)
                        .onSubmit {
                            Task { await viewModel.search() }
                        }

                    if !viewModel.searchText.isEmpty {
                        Button {
                            viewModel.clearSearch()
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundStyle(.secondary)
                        }
                    }
                }
                .padding()
                .background(Color(.systemGray6))
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .padding()

                Divider()

                // Content
                if viewModel.isSearching {
                    Spacer()
                    ProgressView("Searching...")
                    Spacer()
                } else if viewModel.searchText.isEmpty {
                    recentSearchesView
                } else if viewModel.results.isEmpty {
                    Spacer()
                    VStack(spacing: 12) {
                        Image(systemName: "magnifyingglass")
                            .font(.system(size: 40))
                            .foregroundStyle(.secondary)
                        Text("No results found")
                            .font(.headline)
                        Text("Try a different search term")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                } else {
                    searchResultsList
                }
            }
            .navigationTitle("Search")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
            .onAppear {
                isSearchFocused = true
            }
            .onChange(of: viewModel.searchText) { _, _ in
                viewModel.debounceSearch()
            }
        }
    }

    // MARK: - Recent Searches

    private var recentSearchesView: some View {
        Group {
            if viewModel.recentSearches.isEmpty {
                Spacer()
                VStack(spacing: 12) {
                    Image(systemName: "clock.arrow.circlepath")
                        .font(.system(size: 40))
                        .foregroundStyle(.secondary)
                    Text("No recent searches")
                        .font(.headline)
                    Text("Your search history will appear here")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                Spacer()
            } else {
                List {
                    Section {
                        ForEach(viewModel.recentSearches, id: \.self) { query in
                            Button {
                                viewModel.searchText = query
                                Task { await viewModel.search() }
                            } label: {
                                HStack {
                                    Image(systemName: "clock")
                                        .foregroundStyle(.secondary)
                                    Text(query)
                                        .foregroundStyle(.primary)
                                    Spacer()
                                }
                            }
                            .swipeActions {
                                Button(role: .destructive) {
                                    viewModel.removeRecentSearch(query)
                                } label: {
                                    Label("Delete", systemImage: "trash")
                                }
                            }
                        }
                    } header: {
                        HStack {
                            Text("Recent Searches")
                            Spacer()
                            Button("Clear") {
                                viewModel.clearRecentSearches()
                            }
                            .font(.caption)
                        }
                    }
                }
                .listStyle(.insetGrouped)
            }
        }
    }

    // MARK: - Search Results

    private var searchResultsList: some View {
        List {
            Section("\(viewModel.results.count) Results") {
                ForEach(viewModel.results) { item in
                    NavigationLink(value: item) {
                        SearchResultRow(item: item, searchQuery: viewModel.searchText)
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .navigationDestination(for: Item.self) { item in
            TaskDetailView(item: item)
        }
    }
}

// MARK: - Search Result Row

struct SearchResultRow: View {
    let item: Item
    let searchQuery: String

    var body: some View {
        HStack(spacing: 12) {
            // Type icon
            Image(systemName: typeIcon)
                .font(.title2)
                .foregroundStyle(typeColor)
                .frame(width: 32)

            VStack(alignment: .leading, spacing: 4) {
                // Highlighted title
                Text(item.title)
                    .font(.headline)

                HStack(spacing: 8) {
                    Text(item.type.rawValue.capitalized)
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    if item.status == .completed {
                        Label("Done", systemImage: "checkmark")
                            .font(.caption)
                            .foregroundStyle(.green)
                    }

                    if let dueAt = item.dueAt {
                        Text(dueAt.formatted(date: .abbreviated, time: .omitted))
                            .font(.caption)
                            .foregroundStyle(dueAt < Date() ? .red : .secondary)
                    }
                }
            }

            Spacer()

            PriorityBadge(priority: item.priority)
        }
        .padding(.vertical, 4)
    }

    private var typeIcon: String {
        switch item.type {
        case .task: return "checkmark.square"
        case .meeting: return "person.2"
        case .school: return "book"
        }
    }

    private var typeColor: Color {
        switch item.type {
        case .task: return .blue
        case .meeting: return .purple
        case .school: return .orange
        }
    }
}

#Preview {
    SearchView()
}
