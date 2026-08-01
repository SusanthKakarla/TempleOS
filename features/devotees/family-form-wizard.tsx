"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ChevronDown, Pencil, Plus, Trash2, UsersRound } from "lucide-react";
import type { Devotee, DevoteeFamily, Gender, MaritalStatus, RelationshipCode } from "@/types/db";
import { GENDER_OPTIONS, MARITAL_STATUS_OPTIONS, RELATIONSHIP_CODES } from "@/types/db";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface MemberDraft {
  id?: string;
  displayName: string;
  relationship: RelationshipCode | "";
  gender: Gender | "";
  maritalStatus: MaritalStatus | "";
  dateOfBirth: string;
  weddingAnniversary: string;
  birthStar: string;
  ancestralLineage: string;
  whatsappPhone: string;
}

function blankMember(relationship: RelationshipCode | ""): MemberDraft {
  return {
    displayName: "",
    relationship,
    gender: "",
    maritalStatus: "",
    dateOfBirth: "",
    weddingAnniversary: "",
    birthStar: "",
    ancestralLineage: "",
    whatsappPhone: "",
  };
}

type SectionKey = "details" | "members" | "address";

function FormSection({
  isOpen,
  onOpenChange,
  title,
  summary,
  children,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  summary?: string;
  children: ReactNode;
}) {
  return (
    <Card className="glass-card gap-0 overflow-hidden rounded-2xl py-0">
      <Collapsible open={isOpen} onOpenChange={onOpenChange}>
        <CollapsibleTrigger className="flex min-h-11 w-full items-center justify-between gap-3 p-4 text-left">
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">{title}</span>
            {summary && <span className="block truncate text-xs text-muted-foreground">{summary}</span>}
          </span>
          <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4 pb-4">{children}</CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

interface FamilyFormWizardProps {
  mode: "create" | "edit";
  family?: DevoteeFamily;
  members?: (Devotee & { isPrimary: boolean })[];
}

export function FamilyFormWizard({ mode, family, members: initialMembers }: FamilyFormWizardProps) {
  const router = useRouter();
  const t = useTranslations("devotees.familyForm");
  const tCommon = useTranslations("common");
  const tRelationship = useTranslations("devotees.relationshipNames");

  const [familyName, setFamilyName] = useState(family?.familyName ?? "");
  const [address, setAddress] = useState(family?.address ?? "");
  const [city, setCity] = useState(family?.city ?? "");
  const [state, setState] = useState(family?.state ?? "");
  const [pincode, setPincode] = useState(family?.pincode ?? "");
  const [members, setMembers] = useState<MemberDraft[]>(
    initialMembers && initialMembers.length > 0
      ? initialMembers.map((m) => ({
          id: m.id,
          displayName: m.displayName,
          relationship: m.relationship ?? "",
          gender: m.gender ?? "",
          maritalStatus: m.maritalStatus ?? "",
          dateOfBirth: m.dateOfBirth ?? "",
          weddingAnniversary: m.weddingAnniversary ?? "",
          birthStar: m.birthStar ?? "",
          ancestralLineage: m.ancestralLineage ?? "",
          whatsappPhone: m.whatsappPhone ?? "",
        }))
      : [blankMember("head_of_family")],
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // At most one section open at a time — clicking an open section's header
  // collapses it back to null, matching a native accordion.
  const [expandedSection, setExpandedSection] = useState<SectionKey | null>("details");

  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [editingMemberIndex, setEditingMemberIndex] = useState<number | null>(null);
  const [memberDraft, setMemberDraft] = useState<MemberDraft | null>(null);
  const [memberDialogError, setMemberDialogError] = useState<string | null>(null);

  function updateMember(index: number, patch: Partial<MemberDraft>) {
    setMembers((prev) => prev.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  }

  function removeMember(index: number) {
    setMembers((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  function openAddMemberDialog() {
    setEditingMemberIndex(null);
    setMemberDraft(blankMember(""));
    setMemberDialogError(null);
    setMemberDialogOpen(true);
  }

  function openEditMemberDialog(index: number) {
    setEditingMemberIndex(index);
    setMemberDraft({ ...members[index] });
    setMemberDialogError(null);
    setMemberDialogOpen(true);
  }

  function updateMemberDraft(patch: Partial<MemberDraft>) {
    setMemberDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  function saveMemberDialog() {
    if (!memberDraft) return;
    if (!memberDraft.displayName.trim()) {
      setMemberDialogError(t("errors.nameRequired"));
      return;
    }
    if (!memberDraft.relationship) {
      setMemberDialogError(t("errors.relationshipRequired"));
      return;
    }
    if (editingMemberIndex !== null) {
      updateMember(editingMemberIndex, memberDraft);
    } else {
      setMembers((prev) => [...prev, memberDraft]);
    }
    setMemberDialogOpen(false);
  }

  async function handleSubmit(formEvent: FormEvent) {
    formEvent.preventDefault();
    setError(null);

    if (!familyName.trim()) {
      setError(t("errors.familyNameRequired"));
      setExpandedSection("details");
      return;
    }
    if (members.some((m) => !m.relationship)) {
      setError(t("errors.relationshipRequired"));
      setExpandedSection("members");
      return;
    }
    if (members.filter((m) => m.relationship === "head_of_family").length !== 1) {
      setError(t("errors.exactlyOneHead"));
      setExpandedSection("members");
      return;
    }

    setSubmitting(true);
    try {
      const url = mode === "create" ? "/api/devotees/families" : `/api/devotees/families/${family!.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyName,
          address: address || null,
          city: city || null,
          state: state || null,
          pincode: pincode || null,
          members: members.map((m) => ({
            ...(m.id ? { id: m.id } : {}),
            displayName: m.displayName,
            relationship: m.relationship,
            gender: m.gender || null,
            maritalStatus: m.maritalStatus || null,
            dateOfBirth: m.dateOfBirth || null,
            weddingAnniversary: m.weddingAnniversary || null,
            birthStar: m.birthStar || null,
            ancestralLineage: m.ancestralLineage || null,
            whatsappPhone: m.whatsappPhone || null,
          })),
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? t("errorFallback"));
      }

      router.push("/dashboard/devotees");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorFallback"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!family || !window.confirm(t("confirmDelete", { name: family.familyName }))) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/devotees/families/${family.id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? t("deleteError"));
      }
      router.push("/dashboard/devotees");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("deleteError"));
      setSubmitting(false);
    }
  }

  const relationshipItems: Record<string, string> = Object.fromEntries(
    RELATIONSHIP_CODES.map((value) => [value, tRelationship(value)]),
  );
  const genderItems: Record<string, string> = Object.fromEntries(
    GENDER_OPTIONS.map((value) => [value, t(`genderOptions.${value}`)]),
  );
  const maritalStatusItems: Record<string, string> = Object.fromEntries(
    MARITAL_STATUS_OPTIONS.map((value) => [value, t(`maritalStatusOptions.${value}`)]),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">
          {mode === "create" ? t("pageHeader.createTitle") : t("pageHeader.editTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {mode === "create" ? t("pageHeader.createSubtitle") : t("pageHeader.editSubtitle")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormSection
          isOpen={expandedSection === "details"}
          onOpenChange={(open) => setExpandedSection(open ? "details" : null)}
          title={t("sections.details")}
          summary={familyName || t("notSet")}
        >
          <div className="space-y-2">
            <Label htmlFor="familyName">{t("fields.familyName")}</Label>
            <Input id="familyName" value={familyName} onChange={(e) => setFamilyName(e.target.value)} />
          </div>
        </FormSection>

        <FormSection
          isOpen={expandedSection === "members"}
          onOpenChange={(open) => setExpandedSection(open ? "members" : null)}
          title={t("familyMembers")}
          summary={t("memberCount", { count: members.length })}
        >
          <div className="space-y-3">
            {members.map((member, index) => (
              <Card key={member.id ?? `new-${index}`} className="gap-0 rounded-xl border bg-muted/30 py-0">
                <CardContent className="flex items-center gap-3 py-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <UsersRound className="size-4.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{member.displayName || t("newMember")}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {member.relationship ? tRelationship(member.relationship) : t("newMember")}
                      {member.whatsappPhone ? ` · ${member.whatsappPhone}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditMemberDialog(index)}
                      aria-label={tCommon("edit")}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    {members.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMember(index)}
                        aria-label={t("removeMember")}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button type="button" variant="outline" onClick={openAddMemberDialog} className="w-full gap-1.5">
              <Plus className="size-4" />
              {t("addMember")}
            </Button>
          </div>
        </FormSection>

        <FormSection
          isOpen={expandedSection === "address"}
          onOpenChange={(open) => setExpandedSection(open ? "address" : null)}
          title={t("sections.address")}
          summary={[city, state].filter(Boolean).join(", ") || t("notSet")}
        >
          <div className="space-y-2">
            <Label htmlFor="address">{t("fields.address")}</Label>
            <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="city">{t("fields.city")}</Label>
              <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">{t("fields.state")}</Label>
              <Input id="state" value={state} onChange={(e) => setState(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pincode">{t("fields.pincode")}</Label>
              <Input id="pincode" value={pincode} onChange={(e) => setPincode(e.target.value)} />
            </div>
          </div>
        </FormSection>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <Link href="/dashboard/devotees" className="text-sm text-muted-foreground underline-offset-2 hover:underline">
            {t("backToDevotees")}
          </Link>
          <div className="flex items-center gap-2">
            {mode === "edit" && (
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={submitting}>
                {t("deleteFamily")}
              </Button>
            )}
            <Button type="submit" disabled={submitting}>
              {submitting ? t("saving") : mode === "create" ? t("createFamily") : t("saveChanges")}
            </Button>
          </div>
        </div>
      </form>

      <Dialog open={memberDialogOpen} onOpenChange={(open) => setMemberDialogOpen(open)}>
        <DialogContent className="sm:max-w-135">
          <DialogHeader>
            <DialogTitle>{editingMemberIndex !== null ? t("editMember") : t("addMember")}</DialogTitle>
          </DialogHeader>

          {memberDraft && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="memberDraftName">{t("fields.memberName")}</Label>
                <Input
                  id="memberDraftName"
                  value={memberDraft.displayName}
                  onChange={(e) => updateMemberDraft({ displayName: e.target.value })}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="memberDraftPhone">{t("fields.mobileNumber")}</Label>
                <Input
                  id="memberDraftPhone"
                  value={memberDraft.whatsappPhone}
                  onChange={(e) => updateMemberDraft({ whatsappPhone: e.target.value })}
                  placeholder={t("fields.mobileNumberPlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="memberDraftRelationship">{t("fields.relationship")}</Label>
                <Select
                  value={memberDraft.relationship || undefined}
                  onValueChange={(v) => updateMemberDraft({ relationship: (v as RelationshipCode) ?? "" })}
                  items={relationshipItems}
                >
                  <SelectTrigger id="memberDraftRelationship" className="w-full">
                    <SelectValue placeholder={t("fields.relationshipPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {RELATIONSHIP_CODES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {tRelationship(value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="memberDraftDob">{t("fields.dateOfBirth")}</Label>
                  <DatePicker
                    id="memberDraftDob"
                    value={memberDraft.dateOfBirth}
                    onChange={(value) => updateMemberDraft({ dateOfBirth: value })}
                    maxDate={new Date()}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="memberDraftGender">{t("fields.gender")}</Label>
                  <Select
                    value={memberDraft.gender || undefined}
                    onValueChange={(v) => updateMemberDraft({ gender: (v as Gender) ?? "" })}
                    items={genderItems}
                  >
                    <SelectTrigger id="memberDraftGender" className="w-full">
                      <SelectValue placeholder={t("fields.genderPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {GENDER_OPTIONS.map((value) => (
                        <SelectItem key={value} value={value}>
                          {t(`genderOptions.${value}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="memberDraftMaritalStatus">{t("fields.maritalStatus")}</Label>
                  <Select
                    value={memberDraft.maritalStatus || undefined}
                    onValueChange={(v) => updateMemberDraft({ maritalStatus: (v as MaritalStatus) ?? "" })}
                    items={maritalStatusItems}
                  >
                    <SelectTrigger id="memberDraftMaritalStatus" className="w-full">
                      <SelectValue placeholder={t("fields.maritalStatusPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {MARITAL_STATUS_OPTIONS.map((value) => (
                        <SelectItem key={value} value={value}>
                          {t(`maritalStatusOptions.${value}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="memberDraftAnniversary">{t("fields.weddingAnniversary")}</Label>
                  <DatePicker
                    id="memberDraftAnniversary"
                    value={memberDraft.weddingAnniversary}
                    onChange={(value) => updateMemberDraft({ weddingAnniversary: value })}
                    maxDate={new Date()}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="memberDraftBirthStar">{t("fields.birthStar")}</Label>
                  <Input
                    id="memberDraftBirthStar"
                    value={memberDraft.birthStar}
                    onChange={(e) => updateMemberDraft({ birthStar: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="memberDraftGothram">{t("fields.gothram")}</Label>
                  <Input
                    id="memberDraftGothram"
                    value={memberDraft.ancestralLineage}
                    onChange={(e) => updateMemberDraft({ ancestralLineage: e.target.value })}
                  />
                </div>
              </div>

              {memberDialogError && <p className="text-sm text-destructive">{memberDialogError}</p>}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMemberDialogOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="button" onClick={saveMemberDialog}>
              {tCommon("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
