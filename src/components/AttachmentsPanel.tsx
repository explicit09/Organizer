"use client";

import { useState, useRef, useEffect } from "react";
import { clsx } from "clsx";
import {
  Paperclip,
  Upload,
  X,
  File,
  Image,
  FileText,
  FileSpreadsheet,
  FileCode,
  Loader2,
  Download,
  Trash2,
} from "lucide-react";

type Attachment = {
  id: string;
  name: string;
  url: string;
  createdAt: string;
};

interface AttachmentsPanelProps {
  itemId: string;
  className?: string;
}

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();

  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext || "")) {
    return <Image size={16} className="text-purple-400" />;
  }
  if (["pdf", "doc", "docx", "txt", "rtf"].includes(ext || "")) {
    return <FileText size={16} className="text-blue-400" />;
  }
  if (["xls", "xlsx", "csv"].includes(ext || "")) {
    return <FileSpreadsheet size={16} className="text-emerald-400" />;
  }
  if (["js", "ts", "tsx", "jsx", "py", "java", "html", "css"].includes(ext || "")) {
    return <FileCode size={16} className="text-amber-400" />;
  }
  return <File size={16} className="text-muted-foreground" />;
}

export function AttachmentsPanel({ itemId, className }: AttachmentsPanelProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAttachments();
  }, [itemId]);

  async function fetchAttachments() {
    try {
      const res = await fetch(`/api/attachments?itemId=${itemId}`);
      if (res.ok) {
        const data = await res.json();
        setAttachments(data.attachments || []);
      }
    } catch (error) {
      console.error("Failed to fetch attachments:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("itemId", itemId);

        const res = await fetch("/api/attachments", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const attachment = await res.json();
          setAttachments((prev) => [...prev, attachment]);
        }
      }
    } catch (error) {
      console.error("Failed to upload:", error);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(attachmentId: string) {
    try {
      const res = await fetch(`/api/attachments/${attachmentId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      }
    } catch (error) {
      console.error("Failed to delete attachment:", error);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files);
  }

  if (loading) {
    return (
      <div className={clsx("flex items-center justify-center py-4", className)}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Paperclip size={16} className="text-muted-foreground" />
          <span className="text-sm font-medium">Attachments</span>
          {attachments.length > 0 && (
            <span className="text-xs text-muted-foreground">
              ({attachments.length})
            </span>
          )}
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline disabled:opacity-50"
        >
          <Upload size={12} />
          Upload
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleUpload(e.target.files)}
      />

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={clsx(
          "border-2 border-dashed rounded-lg p-4 transition-colors",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-muted-foreground/50"
        )}
      >
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading...
          </div>
        ) : attachments.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground">
            <Paperclip className="mx-auto h-8 w-8 mb-2 opacity-50" />
            <p>Drop files here or click Upload</p>
          </div>
        ) : (
          <div className="space-y-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-3 py-2 group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {getFileIcon(attachment.name)}
                  <span className="text-sm truncate">{attachment.name}</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a
                    href={attachment.url}
                    download={attachment.name}
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                  >
                    <Download size={14} />
                  </a>
                  <button
                    onClick={() => handleDelete(attachment.id)}
                    className="p-1 rounded hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
