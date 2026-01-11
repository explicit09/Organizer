import Foundation
import SwiftUI

@MainActor
class NoteViewModel: ObservableObject {
    @Published var notes: [Note] = []
    @Published var isLoading = false
    @Published var error: String?
    @Published var searchText = ""

    var filteredNotes: [Note] {
        if searchText.isEmpty {
            return notes.sorted { $0.updatedAt > $1.updatedAt }
        }
        return notes.filter {
            $0.title.localizedCaseInsensitiveContains(searchText) ||
            ($0.content?.localizedCaseInsensitiveContains(searchText) ?? false)
        }.sorted { $0.updatedAt > $1.updatedAt }
    }

    func loadNotes() async {
        isLoading = true
        error = nil

        do {
            notes = try await APIClient.shared.fetchNotes()
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    func createNote(title: String, content: String?, itemId: String?) async -> Note? {
        do {
            let response: NoteResponse = try await APIClient.shared.request(
                .createNote(title: title, content: content, itemId: itemId)
            )
            let newNote = response.note.toNote()
            notes.insert(newNote, at: 0)
            return newNote
        } catch {
            self.error = error.localizedDescription
            return nil
        }
    }

    func updateNote(id: String, title: String?, content: String?) async -> Note? {
        do {
            let response: NoteResponse = try await APIClient.shared.request(
                .updateNote(id: id, title: title, content: content)
            )
            let updatedNote = response.note.toNote()
            if let index = notes.firstIndex(where: { $0.id == id }) {
                notes[index] = updatedNote
            }
            return updatedNote
        } catch {
            self.error = error.localizedDescription
            return nil
        }
    }

    func deleteNote(id: String) async -> Bool {
        do {
            try await APIClient.shared.requestVoid(.deleteNote(id: id))
            notes.removeAll { $0.id == id }
            return true
        } catch {
            self.error = error.localizedDescription
            return false
        }
    }
}
