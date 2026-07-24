"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, RefreshCw, Send, Pencil, Trash2 } from "lucide-react";
import type { WhatsAppMessageTemplate, WhatsAppTemplateMetaCategory } from "@/types/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { OverflowActionMenu } from "@/components/overflow-action-menu";
import { EmptyState } from "@/components/empty-state";
import { MobileListView } from "@/components/mobile-list-view";
import { MobileListRow } from "@/components/mobile-list-row";
import { Table, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableShell } from "@/components/table-shell";

const APPROVAL_BADGE_VARIANT: Record<WhatsAppMessageTemplate["approvalStatus"], "default" | "secondary" | "destructive" | "outline"> = {
  approved: "default",
  pending: "secondary",
  rejected: "destructive",
  disabled: "outline",
};

const META_CATEGORIES: WhatsAppTemplateMetaCategory[] = ["UTILITY", "MARKETING", "AUTHENTICATION"];

interface TemplateFormState {
  templateKey: string;
  metaTemplateName: string;
  language: string;
  metaCategory: WhatsAppTemplateMetaCategory;
  variablesText: string; // comma-separated, split on submit
  description: string;
}

const emptyForm: TemplateFormState = {
  templateKey: "",
  metaTemplateName: "",
  language: "en",
  metaCategory: "UTILITY",
  variablesText: "",
  description: "",
};

export function WhatsAppTemplatesTab({ templates }: { templates: WhatsAppMessageTemplate[] }) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppMessageTemplate | null>(null);
  const [form, setForm] = useState<TemplateFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState<WhatsAppMessageTemplate | null>(null);
  const [testSendTemplate, setTestSendTemplate] = useState<WhatsAppMessageTemplate | null>(null);

  function openCreate() {
    setEditingTemplate(null);
    setForm(emptyForm);
    setError(null);
    setFormOpen(true);
  }

  function openEdit(template: WhatsAppMessageTemplate) {
    setEditingTemplate(template);
    setForm({
      templateKey: template.templateKey,
      metaTemplateName: template.metaTemplateName,
      language: template.language,
      metaCategory: template.metaCategory,
      variablesText: template.variables.join(", "),
      description: template.description ?? "",
    });
    setError(null);
    setFormOpen(true);
  }

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    const variables = form.variablesText
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    try {
      const url = editingTemplate ? `/api/whatsapp/templates/${editingTemplate.id}` : "/api/whatsapp/templates";
      const method = editingTemplate ? "PATCH" : "POST";
      const body = editingTemplate
        ? { metaTemplateName: form.metaTemplateName, metaCategory: form.metaCategory, variables, description: form.description || null }
        : {
            templateKey: form.templateKey,
            metaTemplateName: form.metaTemplateName,
            language: form.language,
            metaCategory: form.metaCategory,
            variables,
            description: form.description || null,
          };
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const errBody = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(errBody.error ?? "Failed to save template");
      }
      setFormOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save template");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleEnabled(template: WhatsAppMessageTemplate) {
    await fetch(`/api/whatsapp/templates/${template.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !template.enabled }),
    });
    router.refresh();
  }

  async function handleSync(template: WhatsAppMessageTemplate) {
    await fetch(`/api/whatsapp/templates/${template.id}/sync`, { method: "POST" });
    router.refresh();
  }

  async function handleConfirmDelete() {
    if (!deletingTemplate) return;
    await fetch(`/api/whatsapp/templates/${deletingTemplate.id}`, { method: "DELETE" });
    setDeletingTemplate(null);
    router.refresh();
  }

  function actionItems(template: WhatsAppMessageTemplate) {
    return [
      { label: "Edit", icon: <Pencil className="size-4" />, onClick: () => openEdit(template) },
      { label: "Sync status from Meta", icon: <RefreshCw className="size-4" />, onClick: () => handleSync(template) },
      { label: "Test send", icon: <Send className="size-4" />, onClick: () => setTestSendTemplate(template) },
      {
        label: "Delete",
        icon: <Trash2 className="size-4" />,
        variant: "destructive" as const,
        onClick: () => setDeletingTemplate(template),
      },
    ];
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Register a Meta-approved WhatsApp Message Template once you&apos;ve submitted and approved it directly in
          Meta Business Manager — this is what TempleOS falls back to when a recipient&apos;s 24h conversation window is
          closed.
        </p>
        <Button className="shrink-0 gap-1.5" onClick={openCreate}>
          <Plus className="size-4" />
          Add Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <EmptyState
          icon={<Send className="size-6" />}
          title="No templates configured yet"
          description="Until one is registered here, notifications outside the 24h window will fail fast with a clear reason instead of retrying forever."
          action={
            <Button className="gap-1.5" onClick={openCreate}>
              <Plus className="size-4" />
              Add Template
            </Button>
          }
        />
      ) : (
        <>
          <div className="hidden md:block">
            <TableShell>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key</TableHead>
                    <TableHead>Meta Template Name</TableHead>
                    <TableHead>Language</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Enabled</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <tbody>
                  {templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="align-top">
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{template.templateKey}</code>
                      </TableCell>
                      <TableCell className="align-top font-medium">
                        {template.metaTemplateName}
                        <p className="mt-0.5 text-xs text-muted-foreground">v{template.version} · {template.variables.join(", ") || "no variables"}</p>
                      </TableCell>
                      <TableCell className="align-top">{template.language}</TableCell>
                      <TableCell className="align-top">
                        <Badge variant={APPROVAL_BADGE_VARIANT[template.approvalStatus]}>{template.approvalStatus}</Badge>
                      </TableCell>
                      <TableCell className="align-top">
                        <Switch checked={template.enabled} onCheckedChange={() => handleToggleEnabled(template)} />
                      </TableCell>
                      <TableCell className="align-top text-right">
                        <OverflowActionMenu items={actionItems(template)} />
                      </TableCell>
                    </TableRow>
                  ))}
                </tbody>
              </Table>
            </TableShell>
          </div>

          <div className="space-y-3 md:hidden">
            <MobileListView>
              {templates.map((template) => (
                <MobileListRow
                  key={template.id}
                  title={template.metaTemplateName}
                  subtitle={`${template.templateKey} · ${template.language}`}
                  badge={<Badge variant={APPROVAL_BADGE_VARIANT[template.approvalStatus]}>{template.approvalStatus}</Badge>}
                  trailing={<OverflowActionMenu items={actionItems(template)} />}
                />
              ))}
            </MobileListView>
          </div>
        </>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Template" : "Add Template"}</DialogTitle>
            <DialogDescription>
              {editingTemplate
                ? "Update this template's Meta name, category, or variables."
                : "Register a template you've already had approved in Meta Business Manager."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {!editingTemplate && (
              <div className="space-y-1.5">
                <Label htmlFor="templateKey">Template key</Label>
                <Input
                  id="templateKey"
                  placeholder="e.g. user_welcome"
                  value={form.templateKey}
                  onChange={(e) => setForm((f) => ({ ...f, templateKey: e.target.value }))}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="metaTemplateName">Meta template name</Label>
              <Input
                id="metaTemplateName"
                placeholder="e.g. welcome_user_v1"
                value={form.metaTemplateName}
                onChange={(e) => setForm((f) => ({ ...f, metaTemplateName: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {!editingTemplate && (
                <div className="space-y-1.5">
                  <Label htmlFor="language">Language</Label>
                  <Input
                    id="language"
                    placeholder="en"
                    value={form.language}
                    onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="metaCategory">Category</Label>
                <Select
                  value={form.metaCategory}
                  onValueChange={(v) => setForm((f) => ({ ...f, metaCategory: (v as WhatsAppTemplateMetaCategory) ?? "UTILITY" }))}
                  items={Object.fromEntries(META_CATEGORIES.map((c) => [c, c]))}
                >
                  <SelectTrigger id="metaCategory" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {META_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="variables">Variables (comma-separated, in order)</Label>
              <Input
                id="variables"
                placeholder="templeName, userName, role"
                value={form.variablesText}
                onChange={(e) => setForm((f) => ({ ...f, variablesText: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {testSendTemplate && (
        <TestSendDialog template={testSendTemplate} onOpenChange={(open) => !open && setTestSendTemplate(null)} />
      )}

      <AlertDialog open={deletingTemplate !== null} onOpenChange={(open) => !open && setDeletingTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this template?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingTemplate?.metaTemplateName} will no longer be used as a fallback for &quot;{deletingTemplate?.templateKey}&quot;
              notifications. This only removes it from TempleOS — it doesn&apos;t delete the template from Meta Business Manager.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setDeletingTemplate(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TestSendDialog({
  template,
  onOpenChange,
}: {
  template: WhatsAppMessageTemplate;
  onOpenChange: (open: boolean) => void;
}) {
  const [toPhone, setToPhone] = useState("");
  const [sampleValues, setSampleValues] = useState<Record<string, string>>(
    Object.fromEntries(template.variables.map((v) => [v, ""])),
  );
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSend() {
    setSubmitting(true);
    setResult(null);
    try {
      const response = await fetch(`/api/whatsapp/templates/${template.id}/test-send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toPhone, sampleContext: sampleValues }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string; ok?: boolean };
      if (!response.ok) {
        setResult({ ok: false, message: body.error ?? "Test send failed" });
      } else {
        setResult({ ok: true, message: "Sent! Check the recipient's WhatsApp." });
      }
    } catch {
      setResult({ ok: false, message: "Test send failed — network error." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Test Send</DialogTitle>
          <DialogDescription>
            Sends the real &quot;{template.metaTemplateName}&quot; template — only succeeds once it&apos;s approved in Meta.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="toPhone">Recipient phone number</Label>
            <Input id="toPhone" placeholder="+919876543210" value={toPhone} onChange={(e) => setToPhone(e.target.value)} />
          </div>
          {template.variables.map((variable) => (
            <div key={variable} className="space-y-1.5">
              <Label htmlFor={`var-${variable}`}>{variable}</Label>
              <Input
                id={`var-${variable}`}
                value={sampleValues[variable] ?? ""}
                onChange={(e) => setSampleValues((v) => ({ ...v, [variable]: e.target.value }))}
              />
            </div>
          ))}
          {result && (
            <p className={`text-sm ${result.ok ? "text-emerald" : "text-destructive"}`}>{result.message}</p>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleSend} disabled={submitting || !toPhone}>
            <Send className="size-4" />
            {submitting ? "Sending..." : "Send test"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
