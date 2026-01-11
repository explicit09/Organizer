import SwiftUI

struct NoteEditorView: View {
    @Environment(\.dismiss) private var dismiss
    let note: Note?
    @ObservedObject var viewModel: NoteViewModel

    @State private var title: String = ""
    @State private var content: String = ""
    @State private var isSaving = false
    @State private var showDeleteAlert = false

    private var isNewNote: Bool { note == nil }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Title field
                TextField("Note title", text: $title)
                    .font(.title2)
                    .fontWeight(.semibold)
                    .padding()

                Divider()

                // Content editor
                TextEditor(text: $content)
                    .font(.body)
                    .padding(.horizontal)
                    .scrollContentBackground(.hidden)

                Spacer()
            }
            .navigationTitle(isNewNote ? "New Note" : "Edit Note")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button(isNewNote ? "Create" : "Save") {
                        Task { await saveNote() }
                    }
                    .disabled(title.isEmpty || isSaving)
                }

                if !isNewNote {
                    ToolbarItem(placement: .bottomBar) {
                        Button(role: .destructive) {
                            showDeleteAlert = true
                        } label: {
                            Label("Delete Note", systemImage: "trash")
                                .foregroundStyle(.red)
                        }
                    }
                }
            }
            .onAppear {
                if let note = note {
                    title = note.title
                    content = note.content ?? ""
                }
            }
            .alert("Delete Note", isPresented: $showDeleteAlert) {
                Button("Cancel", role: .cancel) {}
                Button("Delete", role: .destructive) {
                    Task { await deleteNote() }
                }
            } message: {
                Text("Are you sure you want to delete this note? This action cannot be undone.")
            }
        }
    }

    private func saveNote() async {
        isSaving = true

        if let note = note {
            // Update existing note
            _ = await viewModel.updateNote(
                id: note.id,
                title: title,
                content: content.isEmpty ? nil : content
            )
        } else {
            // Create new note
            _ = await viewModel.createNote(
                title: title,
                content: content.isEmpty ? nil : content,
                itemId: nil
            )
        }

        isSaving = false
        dismiss()
    }

    private func deleteNote() async {
        guard let note = note else { return }
        _ = await viewModel.deleteNote(id: note.id)
        dismiss()
    }
}

#Preview("New Note") {
    NoteEditorView(note: nil, viewModel: NoteViewModel())
}

#Preview("Edit Note") {
    NoteEditorView(
        note: Note(
            id: "1",
            userId: "user1",
            itemId: nil,
            title: "Sample Note",
            content: "This is a sample note with some content that can be edited.",
            tags: ["work", "important"],
            createdAt: Date(),
            updatedAt: Date()
        ),
        viewModel: NoteViewModel()
    )
}
