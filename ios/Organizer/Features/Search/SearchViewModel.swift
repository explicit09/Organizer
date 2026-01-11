import Foundation
import SwiftUI

@MainActor
class SearchViewModel: ObservableObject {
    @Published var searchText = ""
    @Published var results: [Item] = []
    @Published var isSearching = false
    @Published var error: String?
    @Published var recentSearches: [String] = []

    private var searchTask: Task<Void, Never>?

    init() {
        loadRecentSearches()
    }

    func search() async {
        guard !searchText.isEmpty else {
            results = []
            return
        }

        isSearching = true
        error = nil

        do {
            results = try await APIClient.shared.search(query: searchText)
            saveRecentSearch(searchText)
        } catch {
            self.error = error.localizedDescription
            results = []
        }

        isSearching = false
    }

    func debounceSearch() {
        searchTask?.cancel()
        searchTask = Task {
            try? await Task.sleep(nanoseconds: 300_000_000) // 300ms debounce
            if !Task.isCancelled {
                await search()
            }
        }
    }

    func clearSearch() {
        searchText = ""
        results = []
    }

    // MARK: - Recent Searches

    private func loadRecentSearches() {
        recentSearches = UserDefaults.standard.stringArray(forKey: "recentSearches") ?? []
    }

    private func saveRecentSearch(_ query: String) {
        var searches = recentSearches
        searches.removeAll { $0.lowercased() == query.lowercased() }
        searches.insert(query, at: 0)
        searches = Array(searches.prefix(10)) // Keep only last 10
        recentSearches = searches
        UserDefaults.standard.set(searches, forKey: "recentSearches")
    }

    func removeRecentSearch(_ query: String) {
        recentSearches.removeAll { $0 == query }
        UserDefaults.standard.set(recentSearches, forKey: "recentSearches")
    }

    func clearRecentSearches() {
        recentSearches = []
        UserDefaults.standard.removeObject(forKey: "recentSearches")
    }
}
