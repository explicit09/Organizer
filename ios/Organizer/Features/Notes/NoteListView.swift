import SwiftUI

struct NoteListView: View {
    @StateObject private var viewModel = NoteViewModel()
    @State private var showEditor = false
    @State private var selectedNote: Note?

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.notes.isEmpty {
                    LoadingView(message: "Loading notes...")
                } else if let error = viewModel.error, viewModel.notes.isEmpty {
                    ErrorView(message: error) {
                        Task { await viewModel.loadNotes() }
                    }
                } else if viewModel.filteredNotes.isEmpty {
                    EmptyState(
                        icon: "note.text",
                        title: viewModel.searchText.isEmpty ? "No Notes" : "No Results",
                        description: viewModel.searchText.isEmpty
                            ? "Create your first note to capture your thoughts."
                            : "No notes match your search.",
                        actionTitle: viewModel.searchText.isEmpty ? "New Note" : nil
                    ) {
                        selectedNote = nil
                        showEditor = true
                    }
                } else {
                    notesList
                }
            }
            .navigationTitle("Notes")
            .searchable(text: $viewModel.searchText, prompt: "Search notes")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        selectedNote = nil
                        showEditor = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .refreshable {
                await viewModel.loadNotes()
            }
            .task {
                await viewModel.loadNotes()
            }
            .sheet(isPresented: $showEditor) {
                NoteEditorView(
                    note: selectedNote,
                    viewModel: viewModel
                )
            }
        }
    }

    private var notesList: some View {
        List {
            ForEach(viewModel.filteredNotes) { note in
                NoteRow(note: note)
                    .contentShape(Rectangle())
                    .onTapGesture {
                        selectedNote = note
                        showEditor = true
                    }
                    .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                        Button(role: .destructive) {
                            Task { await viewModel.deleteNote(id: note.id) }
                        } label: {
                            Label("Delete", systemImage: "trash")
                        }
                    }
            }
        }
        .listStyle(.insetGrouped)
    }
}

// MARK: - Note Row

struct NoteRow: View {
    let note: Note

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(note.title)
                .font(.headline)
                .lineLimit(1)

            if let content = note.content, !content.isEmpty {
                Text(content)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }

            HStack {
                Text(note.updatedAt.formatted(date: .abbreviated, time: .shortened))
                    .font(.caption)
                    .foregroundStyle(.tertiary)

                if !note.tags.isEmpty {
                    Spacer()
                    HStack(spacing: 4) {
                        ForEach(note.tags.prefix(3), id: \.self) { tag in
                            Text(tag)
                                .font(.caption2)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.blue.opacity(0.1))
                                .foregroundStyle(.blue)
                                .clipShape(Capsule())
                        }
                    }
                }
            }
        }
        .padding(.vertical, 4)
    }
}

#Preview {
    NoteListView()
}
