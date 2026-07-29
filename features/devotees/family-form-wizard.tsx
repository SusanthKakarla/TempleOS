"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ChevronDown, Plus, Trash2, UsersRound } from "lucide-react";
import type { Devotee, DevoteeFamily, Gender, MaritalStatus, RelationshipCode, SupportedLanguage } from "@/types/db";
import { GENDER_OPTIONS, MARITAL_STATUS_OPTIONS, RELATIONSHIP_CODES } from "@/types/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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

interface FamilyFormWizardProps {
  mode: "create" | "edit";
  family?: DevoteeFamily;
  members?: (Devotee & { isPrimary: boolean })[];
}

export function FamilyFormWizard({ mode, family, members: initialMembers }: FamilyFormWizardProps) {
  const router = useRouter();
  const t = useTranslations("devotees.familyForm");
  const tRelationship = useTranslations("devotees.relationshipNames");

  const [familyName, setFamilyName] = useState(family?.familyName ?? "");
  const [address, setAddress] = useState(family?.address ?? "");
  const [city, setCity] = useState(family?.city ?? "");
  const [state, setState] = useState(family?.state ?? "");
  const [pincode, setPincode] = useState(family?.pincode ?? "");
  const [primaryLanguage, setPrimaryLanguage] = useState<SupportedLanguage | "">(family?.primaryLanguage ?? "");
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
  // Only one member card is ever expanded at a time (better on mobile — no
  // one long scroll of stacked open forms). `null` means every card starts
  // collapsed, matching the compact-summary-first design.
  const [expandedMember, setExpandedMember] = useState<number | null>(null);
  const cardRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const panelRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Scrolls the just-expanded member into view and focuses its first field —
  // covers both "user tapped a card header" and "a new member was just added".
  useEffect(() => {
    if (expandedMember === null) return;
    const timer = setTimeout(() => {
      cardRefs.current[expandedMember]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      const panel = panelRefs.current[expandedMember];
      panel?.querySelector<HTMLElement>("input, select, textarea")?.focus();
    }, 80);
    return () => clearTimeout(timer);
  }, [expandedMember]);

  function updateMember(index: number, patch: Partial<MemberDraft>) {
    setMembers((prev) => prev.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  }

  function addMember() {
    const newIndex = members.length;
    setMembers((prev) => [...prev, blankMember("")]);
    setExpandedMember(newIndex);
  }

  function removeMember(index: number) {
    setMembers((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
    setExpandedMember((prev) => {
      if (prev === null || prev === index) return null;
      return prev > index ? prev - 1 : prev;
    });
  }

  async function handleSubmit(formEvent: FormEvent) {
    formEvent.preventDefault();
    setError(null);

    if (members.some((m) => !m.relationship)) {
      setError(t("errors.relationshipRequired"));
      return;
    }
    if (members.filter((m) => m.relationship === "head_of_family").length !== 1) {
      setError(t("errors.exactlyOneHead"));
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
          primaryLanguage: primaryLanguage || null,
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

  const languageItems: Record<string, string> = { en: t("languages.en"), te: t("languages.te") };
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
    <div className="space-y-6 pb-24 md:pb-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">
          {mode === "create" ? t("pageHeader.createTitle") : t("pageHeader.editTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {mode === "create" ? t("pageHeader.createSubtitle") : t("pageHeader.editSubtitle")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="glass-card rounded-2xl">
          <CardContent className="space-y-4">
            <h2 className="font-heading text-lg font-semibold">{t("familyDetails")}</h2>
            <div className="space-y-2">
              <Label htmlFor="familyName">{t("fields.familyName")}</Label>
              <Input id="familyName" value={familyName} onChange={(e) => setFamilyName(e.target.value)} required />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="address">{t("fields.address")}</Label>
                <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
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
            <div className="space-y-2">
              <Label htmlFor="primaryLanguage">{t("fields.primaryLanguage")}</Label>
              <Select
                value={primaryLanguage || undefined}
                onValueChange={(v) => setPrimaryLanguage((v as SupportedLanguage) ?? "")}
                items={languageItems}
              >
                <SelectTrigger id="primaryLanguage" className="w-full md:w-60">
                  <SelectValue placeholder={t("fields.primaryLanguagePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{t("languages.en")}</SelectItem>
                  <SelectItem value="te">{t("languages.te")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold">{t("familyMembers")}</h2>
            <Button type="button" variant="outline" size="sm" onClick={addMember} className="gap-1.5">
              <Plus className="size-4" />
              {t("addMember")}
            </Button>
          </div>

          {members.map((member, index) => {
            const isExpanded = expandedMember === index;
            return (
              <div key={member.id ?? `new-${index}`} ref={(el) => { cardRefs.current[index] = el; }}>
                <Card className="glass-card gap-0 overflow-hidden rounded-2xl py-0">
                  <Collapsible
                    open={isExpanded}
                    onOpenChange={(open) => setExpandedMember(open ? index : null)}
                  >
                    <div className="flex items-center gap-1">
                      <CollapsibleTrigger
                        className="flex min-h-11 min-w-0 flex-1 items-center gap-3 p-4 text-left"
                        aria-label={t("memberNumber", { number: index + 1 })}
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <UsersRound className="size-4.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">{t("memberNumber", { number: index + 1 })}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {member.relationship ? tRelationship(member.relationship) : t("newMember")}
                          </span>
                        </span>
                        <ChevronDown
                          className={cn("size-4 shrink-0 text-muted-foreground transition-transform", isExpanded && "rotate-180")}
                        />
                      </CollapsibleTrigger>
                      {index !== 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeMember(index)}
                          aria-label={t("removeMember")}
                          className="mr-2 shrink-0"
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      )}
                    </div>

                    <CollapsibleContent ref={(el) => { panelRefs.current[index] = el; }}>
                      <CardContent className="space-y-4 pb-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor={`member-${index}-name`}>{t("fields.memberName")}</Label>
                            <Input
                              id={`member-${index}-name`}
                              value={member.displayName}
                              onChange={(e) => updateMember(index, { displayName: e.target.value })}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`member-${index}-phone`}>{t("fields.mobileNumber")}</Label>
                            <Input
                              id={`member-${index}-phone`}
                              value={member.whatsappPhone}
                              onChange={(e) => updateMember(index, { whatsappPhone: e.target.value })}
                              placeholder={t("fields.mobileNumberPlaceholder")}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`member-${index}-relationship`}>{t("fields.relationship")}</Label>
                            <Select
                              value={member.relationship || undefined}
                              onValueChange={(v) => updateMember(index, { relationship: (v as RelationshipCode) ?? "" })}
                              items={relationshipItems}
                            >
                              <SelectTrigger id={`member-${index}-relationship`} className="w-full">
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
                          <div className="space-y-2">
                            <Label htmlFor={`member-${index}-dob`}>{t("fields.dateOfBirth")}</Label>
                            <Input
                              id={`member-${index}-dob`}
                              type="date"
                              value={member.dateOfBirth}
                              onChange={(e) => updateMember(index, { dateOfBirth: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`member-${index}-gender`}>{t("fields.gender")}</Label>
                            <Select
                              value={member.gender || undefined}
                              onValueChange={(v) => updateMember(index, { gender: (v as Gender) ?? "" })}
                              items={genderItems}
                            >
                              <SelectTrigger id={`member-${index}-gender`} className="w-full">
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
                            <Label htmlFor={`member-${index}-maritalStatus`}>{t("fields.maritalStatus")}</Label>
                            <Select
                              value={member.maritalStatus || undefined}
                              onValueChange={(v) => updateMember(index, { maritalStatus: (v as MaritalStatus) ?? "" })}
                              items={maritalStatusItems}
                            >
                              <SelectTrigger id={`member-${index}-maritalStatus`} className="w-full">
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
                            <Label htmlFor={`member-${index}-anniversary`}>{t("fields.weddingAnniversary")}</Label>
                            <Input
                              id={`member-${index}-anniversary`}
                              type="date"
                              value={member.weddingAnniversary}
                              onChange={(e) => updateMember(index, { weddingAnniversary: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`member-${index}-birthStar`}>{t("fields.birthStar")}</Label>
                            <Input
                              id={`member-${index}-birthStar`}
                              value={member.birthStar}
                              onChange={(e) => updateMember(index, { birthStar: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`member-${index}-gothram`}>{t("fields.gothram")}</Label>
                            <Input
                              id={`member-${index}-gothram`}
                              value={member.ancestralLineage}
                              onChange={(e) => updateMember(index, { ancestralLineage: e.target.value })}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              </div>
            );
          })}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="sticky bottom-20 z-10 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t bg-background/95 px-4 py-3 shadow-[0_-4px_12px_-8px_rgba(0,0,0,0.15)] backdrop-blur-sm sm:-mx-6 sm:px-6 md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-none">
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
    </div>
  );
}
