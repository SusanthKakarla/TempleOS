"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
import type { PreviewRow } from "@/lib/validation/user-import";
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

const STATUS_VARIANT: Record<PreviewRow["status"], "default" | "secondary" | "destructive"> = {
  valid: "default",
  invalid: "destructive",
  duplicate_in_file: "secondary",
  duplicate_in_db: "secondary",
  empty: "secondary",
};

export function UserImportWizard() {
  const router = useRouter();
  const t = useTranslations("userManagement.importWizard");
  const tRoleNames = useTranslations("userManagement.roleNames");
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
      const response = await fetch("/api/users/import/preview", { method: "POST", body: formData });
      const body = (await response.json().catch(() => ({}))) as PreviewResponse & { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? t("readError"));
      }
      setPreview(body);
      setStep("reviewing");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("readError"));
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
      const response = await fetch("/api/users/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: preview.rows }),
      });
      const body = (await response.json().catch(() => ({}))) as CommitResponse & { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? t("importError"));
      }
      setResult(body);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("importError"));
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
        <h1 className="font-heading text-2xl font-semibold">{t("pageHeader.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("pageHeader.subtitle")}</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {step === "upload" && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-muted">
              <FileUp className="size-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">{t("upload.title")}</p>
              <p className="text-sm text-muted-foreground">{t("upload.description")}</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <label
                className={cn(buttonVariants({ variant: "default" }), "cursor-pointer gap-1.5", busy && "pointer-events-none opacity-50")}
              >
                <Upload className="size-4" />
                {busy ? t("upload.reading") : t("upload.uploadButton")}
                <input
                  type="file"
                  accept=".csv,.xlsx"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={busy}
                />
              </label>
              <Link
                href="/api/users/import/template"
                prefetch={false}
                className={cn(buttonVariants({ variant: "outline" }), "gap-1.5")}
              >
                <Download className="size-4" />
                {t("upload.downloadTemplate")}
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "reviewing" && preview && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <CountChip label={t("countChips.total")} value={preview.totalRows} icon={Users} />
            <CountChip label={t("countChips.valid")} value={preview.validCount} icon={CheckCircle2} tone="text-emerald" />
            <CountChip label={t("countChips.invalid")} value={preview.invalidCount} icon={XCircle} tone="text-destructive" />
            <CountChip label={t("countChips.skipped")} value={preview.skippedCount} icon={AlertTriangle} tone="text-saffron" />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs value={showOnlyProblems ? "problems" : "all"} onValueChange={(v) => setShowOnlyProblems(v === "problems")}>
              <TabsList>
                <TabsTrigger value="all">{t("tabs.all")}</TabsTrigger>
                <TabsTrigger value="problems">{t("tabs.problems")}</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={startOver} disabled={busy}>
                {t("startOver")}
              </Button>
              <Button onClick={handleImport} disabled={busy || preview.validCount === 0}>
                {t("importRows", { count: preview.validCount })}
              </Button>
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto rounded-xl border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columns.row")}</TableHead>
                  <TableHead>{t("columns.name")}</TableHead>
                  <TableHead>{t("columns.phone")}</TableHead>
                  <TableHead>{t("columns.roles")}</TableHead>
                  <TableHead>{t("columns.status")}</TableHead>
                  <TableHead>{t("columns.issues")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRows.map((row) => (
                  <TableRow key={row.rowNumber}>
                    <TableCell className="text-muted-foreground">{row.rowNumber}</TableCell>
                    <TableCell>{row.data.displayName || "—"}</TableCell>
                    <TableCell>{row.data.phone || "—"}</TableCell>
                    <TableCell>
                      {row.data.roles.length > 0 ? row.data.roles.map((r) => tRoleNames(r)).join(", ") : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[row.status]}>{t(`statusLabels.${row.status}`)}</Badge>
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
            <p className="text-sm font-medium">{t("importing.title")}</p>
            <p className="text-sm text-muted-foreground">{t("importing.description")}</p>
          </CardContent>
        </Card>
      )}

      {step === "done" && result && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <CheckCircle2 className="size-10 text-emerald" />
            <div>
              <p className="text-sm font-medium">
                <span className="text-emerald">{t("done.imported", { count: result.imported })}</span>
                {result.skipped > 0 && (
                  <span className="text-muted-foreground"> · {t("done.skipped", { count: result.skipped })}</span>
                )}
                {result.failed > 0 && (
                  <span className="text-destructive"> · {t("done.failed", { count: result.failed })}</span>
                )}
              </p>
              {result.errors.length > 0 && (
                <ul className="mt-2 space-y-1 text-left text-xs text-destructive">
                  {result.errors.map((e) => (
                    <li key={e.rowNumber}>{t("done.rowError", { row: e.rowNumber, message: e.message })}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={startOver}>
                {t("done.importAnother")}
              </Button>
              <Button
                onClick={() => {
                  router.push("/dashboard/users");
                  router.refresh();
                }}
              >
                {t("done.viewUsers")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "upload" && (
        <Link href="/dashboard/users" className="text-sm text-muted-foreground underline-offset-2 hover:underline">
          {t("backToUsers")}
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
