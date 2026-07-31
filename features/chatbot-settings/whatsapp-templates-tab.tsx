"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { BookOpen, Plus, RefreshCw, Send, Pencil, Sparkles, Trash2 } from "lucide-react";
import type { WhatsAppMessageTemplate, WhatsAppTemplateMetaCategory } from "@/types/db";
import { WhatsAppTemplateSetupWizard } from "./whatsapp-template-setup-wizard";
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

export function WhatsAppTemplatesTab({
  templates,
  whatsappConnected = false,
}: {
  templates: WhatsAppMessageTemplate[];
  whatsappConnected?: boolean;
}) {
  const router = useRouter();
  const t = useTranslations("chatbotSettings.whatsappTemplateSetup");
  const [formOpen, setFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppMessageTemplate | null>(null);
  const [form, setForm] = useState<TemplateFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState<WhatsAppMessageTemplate | null>(null);
  const [testSendTemplate, setTestSendTemplate] = useState<WhatsAppMessageTemplate | null>(null);
  const [guideTemplate, setGuideTemplate] = useState<WhatsAppMessageTemplate | null>(null);
  const [setupWizardOpen, setSetupWizardOpen] = useState(false);
  const [setupWizardKey, setSetupWizardKey] = useState(0);

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
        throw new Error(errBody.error ?? t("formDialog.defaultError"));
      }
      setFormOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("formDialog.defaultError"));
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
      { label: t("actions.edit"), icon: <Pencil className="size-4" />, onClick: () => openEdit(template) },
      { label: t("actions.sync"), icon: <RefreshCw className="size-4" />, onClick: () => handleSync(template) },
      { label: t("actions.testSend"), icon: <Send className="size-4" />, onClick: () => setTestSendTemplate(template) },
      ...(template.submissionGuide
        ? [{ label: t("guideDialog.menuItem"), icon: <BookOpen className="size-4" />, onClick: () => setGuideTemplate(template) }]
        : []),
      {
        label: t("actions.delete"),
        icon: <Trash2 className="size-4" />,
        variant: "destructive" as const,
        onClick: () => setDeletingTemplate(template),
      },
    ];
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{t("intro")}</p>
        <div className="flex shrink-0 flex-wrap gap-2">
          {whatsappConnected && (
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={() => {
                setSetupWizardKey((k) => k + 1);
                setSetupWizardOpen(true);
              }}
            >
              <Sparkles className="size-4" />
              {t("setupButton")}
            </Button>
          )}
          <Button className="gap-1.5" onClick={openCreate}>
            <Plus className="size-4" />
            {t("addTemplateButton")}
          </Button>
        </div>
      </div>

      {templates.length === 0 ? (
        <EmptyState
          icon={<Send className="size-6" />}
          title={t("emptyState.title")}
          description={t("emptyState.description")}
          action={
            <Button className="gap-1.5" onClick={openCreate}>
              <Plus className="size-4" />
              {t("addTemplateButton")}
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
                    <TableHead>{t("table.key")}</TableHead>
                    <TableHead>{t("table.metaTemplateName")}</TableHead>
                    <TableHead>{t("table.language")}</TableHead>
                    <TableHead>{t("table.status")}</TableHead>
                    <TableHead>{t("table.enabled")}</TableHead>
                    <TableHead className="text-right">{t("table.actions")}</TableHead>
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
                        <p className="mt-0.5 text-xs text-muted-foreground">v{template.version} · {template.variables.join(", ") || t("table.noVariables")}</p>
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
            <DialogTitle>{editingTemplate ? t("formDialog.editTitle") : t("formDialog.addTitle")}</DialogTitle>
            <DialogDescription>
              {editingTemplate ? t("formDialog.editDescription") : t("formDialog.addDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {!editingTemplate && (
              <div className="space-y-1.5">
                <Label htmlFor="templateKey">{t("formDialog.templateKeyLabel")}</Label>
                <Input
                  id="templateKey"
                  placeholder="e.g. user_welcome"
                  value={form.templateKey}
                  onChange={(e) => setForm((f) => ({ ...f, templateKey: e.target.value }))}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="metaTemplateName">{t("formDialog.metaTemplateNameLabel")}</Label>
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
                  <Label htmlFor="language">{t("formDialog.languageLabel")}</Label>
                  <Input
                    id="language"
                    placeholder="en"
                    value={form.language}
                    onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="metaCategory">{t("formDialog.categoryLabel")}</Label>
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
              <Label htmlFor="variables">{t("formDialog.variablesLabel")}</Label>
              <Input
                id="variables"
                placeholder="templeName, userName, role"
                value={form.variablesText}
                onChange={(e) => setForm((f) => ({ ...f, variablesText: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">{t("formDialog.descriptionLabel")}</Label>
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
              {submitting ? t("formDialog.saving") : t("formDialog.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {testSendTemplate && (
        <TestSendDialog template={testSendTemplate} onOpenChange={(open) => !open && setTestSendTemplate(null)} />
      )}

      {setupWizardOpen && (
        <WhatsAppTemplateSetupWizard
          key={setupWizardKey}
          onOpenChange={setSetupWizardOpen}
          onCompleted={() => router.refresh()}
        />
      )}

      {guideTemplate && (
        <SubmissionGuideDialog template={guideTemplate} onOpenChange={(open) => !open && setGuideTemplate(null)} />
      )}

      <AlertDialog open={deletingTemplate !== null} onOpenChange={(open) => !open && setDeletingTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDialog.description", {
                metaTemplateName: deletingTemplate?.metaTemplateName ?? "",
                templateKey: deletingTemplate?.templateKey ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setDeletingTemplate(null)}>
              {t("deleteDialog.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              {t("deleteDialog.confirm")}
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
  const t = useTranslations("chatbotSettings.whatsappTemplateSetup.testSendDialog");
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
        setResult({ ok: false, message: body.error ?? t("defaultError") });
      } else {
        setResult({ ok: true, message: t("success") });
      }
    } catch {
      setResult({ ok: false, message: t("networkError") });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description", { metaTemplateName: template.metaTemplateName })}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="toPhone">{t("recipientLabel")}</Label>
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
            {submitting ? t("sending") : t("sendTest")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Read-only, copy-paste-ready guidance for submitting this template directly in Meta Business Manager — TempleOS never submits templates to Meta itself. */
function SubmissionGuideDialog({
  template,
  onOpenChange,
}: {
  template: WhatsAppMessageTemplate;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("chatbotSettings.whatsappTemplateSetup.guideDialog");

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div>
            <p className="mb-1 font-medium">{t("recommendedName")}</p>
            <code className="block rounded-md bg-muted px-2.5 py-1.5 text-xs">{template.metaTemplateName}</code>
          </div>
          <div>
            <p className="mb-1 font-medium">{t("recommendedCategory")}</p>
            <code className="block rounded-md bg-muted px-2.5 py-1.5 text-xs">{template.metaCategory}</code>
          </div>
          <div>
            <p className="mb-1 font-medium">{t("recommendedLanguage")}</p>
            <code className="block rounded-md bg-muted px-2.5 py-1.5 text-xs">{template.language}</code>
          </div>
          <div>
            <p className="mb-1 font-medium">{t("recommendedBody")}</p>
            <pre className="whitespace-pre-wrap rounded-md bg-muted px-2.5 py-1.5 text-xs">
              {template.submissionGuide ?? t("noGuide")}
            </pre>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>{t("close")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
