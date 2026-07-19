"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileUp,
  Upload,
  Users,
  XCircle,
} from "lucide-react";
import type { PreviewRow } from "@/lib/validation/devotee-import";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Step = "upload" | "reviewing" | "importing" | "done";

interface PreviewResponse {
  totalRows: number;
  validCount: number;
  invalidCount: number;
  skippedCount: number;
  rows: PreviewRow[];
}

interface CommitResponse {
  imported: number;
  skipped: number;
  failed: number;
  errors: { rowNumber: number; message: string }[];
}

const STATUS_LABEL: Record<PreviewRow["status"], string> = {
  valid: "Valid",
  invalid: "Invalid",
  duplicate_in_file: "Duplicate (in file)",
  duplicate_in_db: "Duplicate (existing)",
  empty: "Empty row",
};

const STATUS_VARIANT: Record<PreviewRow["status"], "default" | "secondary" | "destructive"> = {
  valid: "default",
  invalid: "destructive",
  duplicate_in_file: "secondary",
  duplicate_in_db: "secondary",
  empty: "secondary",
};

export function DevoteeImportWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [result, setResult] = useState<CommitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showOnlyProblems, setShowOnlyProblems] = useState(false);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/devotees/import/preview", { method: "POST", body: formData });
      const body = (await response.json().catch(() => ({}))) as PreviewResponse & { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to read file");
      }
      setPreview(body);
      setStep("reviewing");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read file");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  async function handleImport() {
    if (!preview) return;
    setError(null);
    setBusy(true);
    setStep("importing");
    try {
      const response = await fetch("/api/devotees/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: preview.rows }),
      });
      const body = (await response.json().catch(() => ({}))) as CommitResponse & { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "Import failed");
      }
      setResult(body);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
      setStep("reviewing");
    } finally {
      setBusy(false);
    }
  }

  function startOver() {
    setPreview(null);
    setResult(null);
    setError(null);
    setShowOnlyProblems(false);
    setStep("upload");
  }

  const visibleRows = preview
    ? showOnlyProblems
      ? preview.rows.filter((r) => r.status !== "valid")
      : preview.rows
    : [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Import Devotees</h1>
        <p className="text-sm text-muted-foreground">
          Upload a CSV or Excel file to bulk-add devotees. Review and fix any issues before importing.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {step === "upload" && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-muted">
              <FileUp className="size-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Upload a .csv or .xlsx file</p>
              <p className="text-sm text-muted-foreground">
                Needs &ldquo;Name&rdquo; and &ldquo;WhatsApp Phone&rdquo; columns at minimum.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <label
                className={cn(buttonVariants({ variant: "default" }), "cursor-pointer gap-1.5", busy && "pointer-events-none opacity-50")}
              >
                <Upload className="size-4" />
                {busy ? "Reading file…" : "Upload file"}
                <input
                  type="file"
                  accept=".csv,.xlsx"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={busy}
                />
              </label>
              <Link
                href="/api/devotees/import/template"
                prefetch={false}
                className={cn(buttonVariants({ variant: "outline" }), "gap-1.5")}
              >
                <Download className="size-4" />
                Download template
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "reviewing" && preview && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <CountChip label="Total" value={preview.totalRows} icon={Users} />
            <CountChip label="Valid" value={preview.validCount} icon={CheckCircle2} tone="text-emerald" />
            <CountChip label="Invalid" value={preview.invalidCount} icon={XCircle} tone="text-destructive" />
            <CountChip label="Skipped" value={preview.skippedCount} icon={AlertTriangle} tone="text-saffron" />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs value={showOnlyProblems ? "problems" : "all"} onValueChange={(v) => setShowOnlyProblems(v === "problems")}>
              <TabsList>
                <TabsTrigger value="all">All rows</TabsTrigger>
                <TabsTrigger value="problems">Only issues</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={startOver} disabled={busy}>
                Start over
              </Button>
              <Button onClick={handleImport} disabled={busy || preview.validCount === 0}>
                Import {preview.validCount} valid row{preview.validCount === 1 ? "" : "s"}
              </Button>
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto rounded-xl border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Row</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issues</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRows.map((row) => (
                  <TableRow key={row.rowNumber}>
                    <TableCell className="text-muted-foreground">{row.rowNumber}</TableCell>
                    <TableCell>{row.data.displayName || "—"}</TableCell>
                    <TableCell>{row.data.whatsappPhone || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[row.status]}>{STATUS_LABEL[row.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {row.errors.join("; ") || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {step === "importing" && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-sm font-medium">Importing devotees…</p>
            <p className="text-sm text-muted-foreground">This may take a moment for larger files.</p>
          </CardContent>
        </Card>
      )}

      {step === "done" && result && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <CheckCircle2 className="size-10 text-emerald" />
            <div>
              <p className="text-sm font-medium">
                <span className="text-emerald">{result.imported} imported</span>
                {result.skipped > 0 && <span className="text-muted-foreground"> · {result.skipped} skipped</span>}
                {result.failed > 0 && <span className="text-destructive"> · {result.failed} failed</span>}
              </p>
              {result.errors.length > 0 && (
                <ul className="mt-2 space-y-1 text-left text-xs text-destructive">
                  {result.errors.map((e) => (
                    <li key={e.rowNumber}>
                      Row {e.rowNumber}: {e.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={startOver}>
                Import another file
              </Button>
              <Button
                onClick={() => {
                  router.push("/dashboard/devotees");
                  router.refresh();
                }}
              >
                View devotees
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "upload" && (
        <Link href="/dashboard/devotees" className="text-sm text-muted-foreground underline-offset-2 hover:underline">
          Back to devotees
        </Link>
      )}
    </div>
  );
}

function CountChip({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof Users;
  tone?: string;
}) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2">
        <Icon className={`size-4 ${tone ?? "text-muted-foreground"}`} />
        <div>
          <p className="text-lg font-semibold tabular-nums">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </Card>
  );
}
