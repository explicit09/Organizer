"use client";

import { useState, useRef } from "react";
import { clsx } from "clsx";
import {
  Download,
  Upload,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/Dialog";

interface ImportExportProps {
  className?: string;
}

type ExportFormat = "csv" | "json";

export function ImportExport({ className }: ImportExportProps) {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState<"import" | "export">("export");
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleExport(format: ExportFormat) {
    setExporting(true);
    setResult(null);

    try {
      const res = await fetch(`/api/items`);
      if (!res.ok) throw new Error("Failed to fetch items");

      const data = await res.json();
      const items = data.items || [];

      let content: string;
      let filename: string;
      let mimeType: string;

      if (format === "json") {
        content = JSON.stringify(items, null, 2);
        filename = `organizer-export-${new Date().toISOString().slice(0, 10)}.json`;
        mimeType = "application/json";
      } else {
        // CSV export
        const headers = [
          "id",
          "type",
          "title",
          "details",
          "status",
          "priority",
          "tags",
          "dueAt",
          "createdAt",
        ];
        const rows = items.map((item: Record<string, unknown>) =>
          headers
            .map((h) => {
              const value = item[h];
              if (Array.isArray(value)) return value.join(";");
              if (typeof value === "string" && value.includes(",")) {
                return `"${value.replace(/"/g, '""')}"`;
              }
              return value ?? "";
            })
            .join(",")
        );
        content = [headers.join(","), ...rows].join("\n");
        filename = `organizer-export-${new Date().toISOString().slice(0, 10)}.csv`;
        mimeType = "text/csv";
      }

      // Download file
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setResult({
        success: true,
        message: `Exported ${items.length} items to ${filename}`,
      });
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : "Export failed",
      });
    } finally {
      setExporting(false);
    }
  }

  async function handleImport(file: File) {
    setImporting(true);
    setResult(null);

    try {
      const text = await file.text();
      let items: Array<Record<string, unknown>>;

      if (file.name.endsWith(".json")) {
        items = JSON.parse(text);
        if (!Array.isArray(items)) {
          throw new Error("JSON file must contain an array of items");
        }
      } else {
        // Parse CSV
        const lines = text.split("\n").filter((line) => line.trim());
        if (lines.length < 2) {
          throw new Error("CSV file must have a header row and at least one data row");
        }

        const headers = lines[0].split(",").map((h) => h.trim());
        items = lines.slice(1).map((line) => {
          const values = parseCSVLine(line);
          const obj: Record<string, unknown> = {};
          headers.forEach((header, i) => {
            if (header === "tags" && values[i]) {
              obj[header] = values[i].split(";").filter(Boolean);
            } else {
              obj[header] = values[i] || undefined;
            }
          });
          return obj;
        });
      }

      // Import items
      let imported = 0;
      for (const item of items) {
        const res = await fetch("/api/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: item.type || "task",
            title: item.title || "Imported item",
            details: item.details,
            status: item.status || "not_started",
            priority: item.priority || "medium",
            tags: item.tags || [],
            dueAt: item.dueAt,
          }),
        });

        if (res.ok) imported++;
      }

      setResult({
        success: true,
        message: `Imported ${imported} of ${items.length} items`,
      });
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : "Import failed",
      });
    } finally {
      setImporting(false);
    }
  }

  function parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  }

  function openImportDialog() {
    setMode("import");
    setResult(null);
    setDialogOpen(true);
  }

  function openExportDialog() {
    setMode("export");
    setResult(null);
    setDialogOpen(true);
  }

  return (
    <div className={clsx("flex items-center gap-2", className)}>
      <button
        onClick={openImportDialog}
        className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted transition-colors"
      >
        <Upload size={16} />
        Import
      </button>
      <button
        onClick={openExportDialog}
        className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted transition-colors"
      >
        <Download size={16} />
        Export
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImport(file);
        }}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {mode === "import" ? "Import Data" : "Export Data"}
            </DialogTitle>
            <DialogDescription>
              {mode === "import"
                ? "Import tasks from a CSV or JSON file"
                : "Export your tasks to a file"}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {mode === "import" ? (
              <div className="space-y-4">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                  className="w-full flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-border p-8 hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  {importing ? (
                    <>
                      <Loader2 className="h-10 w-10 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">Importing...</span>
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
                      <div className="text-center">
                        <p className="font-medium">Choose a file</p>
                        <p className="text-sm text-muted-foreground">
                          Supports CSV and JSON formats
                        </p>
                      </div>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleExport("csv")}
                  disabled={exporting}
                  className="flex flex-col items-center gap-3 rounded-lg border border-border p-6 hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <FileSpreadsheet className="h-8 w-8 text-emerald-500" />
                  <div className="text-center">
                    <p className="font-medium">CSV</p>
                    <p className="text-xs text-muted-foreground">
                      Compatible with Excel
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => handleExport("json")}
                  disabled={exporting}
                  className="flex flex-col items-center gap-3 rounded-lg border border-border p-6 hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <FileSpreadsheet className="h-8 w-8 text-blue-500" />
                  <div className="text-center">
                    <p className="font-medium">JSON</p>
                    <p className="text-xs text-muted-foreground">
                      Full data export
                    </p>
                  </div>
                </button>
              </div>
            )}

            {result && (
              <div
                className={clsx(
                  "mt-4 flex items-center gap-2 rounded-md p-3 text-sm",
                  result.success
                    ? "bg-emerald-500/10 text-emerald-500"
                    : "bg-rose-500/10 text-rose-500"
                )}
              >
                {result.success ? (
                  <CheckCircle2 size={16} />
                ) : (
                  <AlertCircle size={16} />
                )}
                {result.message}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
