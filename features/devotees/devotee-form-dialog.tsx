"use client";

import { useEffect, useState, type FormEvent, type ReactElement } from "react";
import { useTranslations } from "next-intl";
import {
  Bell,
  Cake,
  Heart,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  Search,
  Sparkles,
  Trash2,
  User,
  UserRound,
  Users,
  X,
} from "lucide-react";
import type { Devotee, DevoteeFamilySummary, Gender, MaritalStatus, RelationshipCode, SupportedLanguage } from "@/types/db";
import { GENDER_OPTIONS, MARITAL_STATUS_OPTIONS, RELATIONSHIP_CODES } from "@/types/db";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LabeledInput } from "@/components/ui/labeled-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const NO_FAMILY_VALUE = "__none__";

type FamilyMode = "none" | "existing" | "new";
type MemberDraft =
  | {
      localId: string;
      kind: "existing";
      devotee: Devotee;
      relationship: RelationshipCode | "";
      moveFromExistingFamily: boolean;
    }
  | {
      localId: string;
      kind: "new";
      displayName: string;
      whatsappPhone: string;
      relationship: RelationshipCode | "";
    };

interface DevoteeFormDialogProps {
  mode: "create" | "edit";
  devotee?: Devotee;
  trigger: ReactElement;
  onSaved: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function localId() {
  return Math.random().toString(36).slice(2);
}

export function DevoteeFormDialog({ mode, devotee, trigger, onSaved, open: controlledOpen, onOpenChange }: DevoteeFormDialogProps) {
  const t = useTranslations("devotees.formDialog");
  const tRelationship = useTranslations("devotees.relationshipNames");
  const tCommon = useTranslations("common");
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen;

  const [whatsappPhone, setWhatsappPhone] = useState(devotee?.whatsappPhone ?? "");
  const [displayName, setDisplayName] = useState(devotee?.displayName ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(devotee?.dateOfBirth ?? "");
  const [birthStar, setBirthStar] = useState(devotee?.birthStar ?? "");
  const [ancestralLineage, setAncestralLineage] = useState(devotee?.ancestralLineage ?? "");
  const [gender, setGender] = useState<Gender | "">(devotee?.gender ?? "");
  const [maritalStatus, setMaritalStatus] = useState<MaritalStatus | "">(devotee?.maritalStatus ?? "");
  const [weddingAnniversary, setWeddingAnniversary] = useState(devotee?.weddingAnniversary ?? "");
  const [whatsappOptInStatus, setWhatsappOptInStatus] = useState(devotee?.whatsappOptInStatus ?? true);
  const [eventNotificationsEnabled, setEventNotificationsEnabled] = useState(devotee?.eventNotificationsEnabled ?? true);
  const [preferredLanguage, setPreferredLanguage] = useState<SupportedLanguage | "">(devotee?.preferredLanguage ?? "");
  const [familyId, setFamilyId] = useState(devotee?.familyId ?? "");
  const [address, setAddress] = useState(devotee?.address ?? "");
  const [notes, setNotes] = useState(devotee?.notes ?? "");

  const [families, setFamilies] = useState<DevoteeFamilySummary[]>([]);
  const [familyMode, setFamilyMode] = useState<FamilyMode>("none");
  const [selectedFamilyId, setSelectedFamilyId] = useState("");
  const [familySearch, setFamilySearch] = useState("");
  const [searchingFamilies, setSearchingFamilies] = useState(false);
  const [primaryRelationship, setPrimaryRelationship] = useState<RelationshipCode | "">("head_of_family");
  const [familyName, setFamilyName] = useState("");
  const [familyAddress, setFamilyAddress] = useState("");
  const [familyCity, setFamilyCity] = useState("");
  const [familyState, setFamilyState] = useState("");
  const [familyPincode, setFamilyPincode] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [memberSearchResults, setMemberSearchResults] = useState<Devotee[]>([]);
  const [members, setMembers] = useState<MemberDraft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchingMembers, setSearchingMembers] = useState(false);

  const genderItems: Record<string, string> = Object.fromEntries(GENDER_OPTIONS.map((value) => [value, t(`genderOptions.${value}`)]));
  const maritalStatusItems: Record<string, string> = Object.fromEntries(
    MARITAL_STATUS_OPTIONS.map((value) => [value, t(`maritalStatusOptions.${value}`)]),
  );
  const relationshipItems: Record<string, string> = Object.fromEntries(
    RELATIONSHIP_CODES.map((value) => [value, tRelationship(value)]),
  );

  function resetToDevotee() {
    setWhatsappPhone(devotee?.whatsappPhone ?? "");
    setDisplayName(devotee?.displayName ?? "");
    setDateOfBirth(devotee?.dateOfBirth ?? "");
    setBirthStar(devotee?.birthStar ?? "");
    setAncestralLineage(devotee?.ancestralLineage ?? "");
    setGender(devotee?.gender ?? "");
    setMaritalStatus(devotee?.maritalStatus ?? "");
    setWeddingAnniversary(devotee?.weddingAnniversary ?? "");
    setWhatsappOptInStatus(devotee?.whatsappOptInStatus ?? true);
    setEventNotificationsEnabled(devotee?.eventNotificationsEnabled ?? true);
    setPreferredLanguage(devotee?.preferredLanguage ?? "");
    setFamilyId(devotee?.familyId ?? "");
    setAddress(devotee?.address ?? "");
    setNotes(devotee?.notes ?? "");
    setFamilyMode("none");
    setSelectedFamilyId("");
    setFamilySearch("");
    setPrimaryRelationship("head_of_family");
    setFamilyName("");
    setFamilyAddress("");
    setFamilyCity("");
    setFamilyState("");
    setFamilyPincode("");
    setMemberSearch("");
    setMemberSearchResults([]);
    setMembers([]);
    setError(null);
  }

  function loadFamilies(search: string, options: { allowBlank?: boolean } = {}) {
    const trimmedSearch = search.trim();
    if (!trimmedSearch && !options.allowBlank) {
      setFamilies([]);
      setSearchingFamilies(false);
      return;
    }
    const query = trimmedSearch ? `?search=${encodeURIComponent(trimmedSearch)}` : "";
    setSearchingFamilies(true);
    fetch(`/api/devotees/families${query}`)
      .then((res) => res.json())
      .then((body: { families?: DevoteeFamilySummary[] }) => setFamilies(body.families ?? []))
      .catch(() => setFamilies([]))
      .finally(() => setSearchingFamilies(false));
  }

  useEffect(() => {
    if (!open || familyMode !== "existing" || selectedFamilyId) return;
    const trimmedSearch = familySearch.trim();
    if (!trimmedSearch) return;
    const timeout = window.setTimeout(() => loadFamilies(trimmedSearch), 250);
    return () => window.clearTimeout(timeout);
  }, [familyMode, familySearch, open, selectedFamilyId]);

  async function searchExistingMembers() {
    if (memberSearch.trim().length < 2) {
      setMemberSearchResults([]);
      return;
    }
    setSearchingMembers(true);
    try {
      const response = await fetch(`/api/devotees?search=${encodeURIComponent(memberSearch.trim())}`);
      const body = (await response.json().catch(() => ({}))) as { devotees?: Devotee[] };
      const selectedIds = new Set(members.filter((m) => m.kind === "existing").map((m) => m.devotee.id));
      setMemberSearchResults((body.devotees ?? []).filter((d) => !selectedIds.has(d.id)));
    } finally {
      setSearchingMembers(false);
    }
  }

  function addExistingMember(devoteeToAdd: Devotee) {
    setMembers((prev) => [
      ...prev,
      { localId: localId(), kind: "existing", devotee: devoteeToAdd, relationship: "", moveFromExistingFamily: false },
    ]);
    setMemberSearchResults((prev) => prev.filter((d) => d.id !== devoteeToAdd.id));
  }

  function updateMember(localId: string, patch: Partial<MemberDraft>) {
    setMembers((prev) => prev.map((member) => (member.localId === localId ? ({ ...member, ...patch } as MemberDraft) : member)));
  }

  function selectExistingFamily(family: DevoteeFamilySummary) {
    setSelectedFamilyId(family.id);
    if (family.primaryDevoteeId && primaryRelationship === "head_of_family") {
      setPrimaryRelationship("");
    }
  }

  function clearSelectedFamily() {
    setSelectedFamilyId("");
  }

  function updatePrimaryRelationship(relationship: RelationshipCode | "") {
    setPrimaryRelationship(relationship);
    if (relationship === "head_of_family") {
      setMembers((prev) =>
        prev.map((member) =>
          member.relationship === "head_of_family" ? ({ ...member, relationship: "" } as MemberDraft) : member,
        ),
      );
    }
  }

  function updateMemberRelationship(localId: string, relationship: RelationshipCode | "") {
    if (relationship === "head_of_family" && primaryRelationship === "head_of_family") {
      setPrimaryRelationship("");
    }
    setMembers((prev) =>
      prev.map((member) => {
        if (member.localId === localId) return { ...member, relationship } as MemberDraft;
        if (relationship === "head_of_family" && member.relationship === "head_of_family") {
          return { ...member, relationship: "" } as MemberDraft;
        }
        return member;
      }),
    );
  }

  function removeMember(localId: string) {
    setMembers((prev) => prev.filter((member) => member.localId !== localId));
  }

  function createPayload() {
    const devoteePayload = {
      displayName,
      whatsappPhone,
      whatsappOptInStatus,
      dateOfBirth,
      birthStar,
      ancestralLineage,
      gender: gender || null,
      maritalStatus: maritalStatus || null,
      weddingAnniversary,
    };

    if (familyMode === "existing") {
      return {
        devotee: devoteePayload,
        family: {
          mode: "existing" as const,
          familyId: selectedFamilyId,
          relationship: primaryRelationship,
        },
      };
    }
    if (familyMode === "new") {
      return {
        devotee: devoteePayload,
        family: {
          mode: "new" as const,
          familyName,
          address: familyAddress || null,
          city: familyCity || null,
          state: familyState || null,
          pincode: familyPincode || null,
          primaryRelationship,
          members: members.map((member) =>
            member.kind === "existing"
              ? {
                  kind: "existing" as const,
                  devoteeId: member.devotee.id,
                  relationship: member.relationship,
                  currentFamilyId: member.devotee.familyId,
                  moveFromExistingFamily: member.moveFromExistingFamily,
                }
              : {
                  kind: "new" as const,
                  displayName: member.displayName,
                  whatsappPhone: member.whatsappPhone || null,
                  relationship: member.relationship,
                },
          ),
        },
      };
    }
    return { devotee: devoteePayload, family: { mode: "none" as const } };
  }

  const selectedFamily = families.find((family) => family.id === selectedFamilyId) ?? null;
  const similarFamilies =
    familyMode === "new" && familyName.trim().length >= 2
      ? families
          .filter((family) => {
            const inputName = familyName.trim().toLowerCase();
            const existingName = family.familyName.toLowerCase();
            const pincodeMatches = familyPincode.trim().length >= 2 && (family.pincode?.includes(familyPincode.trim()) ?? false);
            return existingName.includes(inputName) || inputName.includes(existingName) || pincodeMatches;
          })
          .slice(0, 3)
      : [];

  async function handleSubmit(formEvent: FormEvent) {
    formEvent.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const url = mode === "create" ? "/api/devotees/registration" : `/api/devotees/${devotee!.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "create"
            ? createPayload()
            : {
                whatsappPhone,
                displayName,
                whatsappOptInStatus,
                dateOfBirth,
                birthStar,
                ancestralLineage,
                gender: gender || null,
                maritalStatus: maritalStatus || null,
                weddingAnniversary,
                eventNotificationsEnabled,
                preferredLanguage: preferredLanguage || null,
                familyId: familyMode === "existing" ? (selectedFamilyId || null) : (familyMode === "new" ? undefined : (familyId || null)),
                address,
                notes,
                ...(familyMode === "new" ? {
                  newFamily: {
                    familyName,
                    relationship: primaryRelationship || "head_of_family",
                    address: familyAddress || null,
                    city: familyCity || null,
                    state: familyState || null,
                    pincode: familyPincode || null,
                  },
                } : {}),
              },
        ),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? t("errorFallback"));
      }

      setOpen(false);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorFallback"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          resetToDevotee();
          if (mode === "edit") {
            loadFamilies("", { allowBlank: true });
          }
        }
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-190 max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:right-0 max-sm:translate-x-0 max-sm:translate-y-0 max-sm:max-w-full max-sm:rounded-b-none max-sm:max-h-[92dvh]">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? t("createTitle") : t("editTitle")}</DialogTitle>
          <DialogDescription>{mode === "create" ? t("createDescription") : t("editDescription")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <section className="space-y-4">
            <LabeledInput
              id="displayName"
              label={t("fields.name")}
              icon={<User />}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              inputSize="lg"
              required
              requiredLabel={tCommon("required")}
            />
            <LabeledInput
              id="whatsappPhone"
              label={t("fields.phoneNumber")}
              icon={<Phone />}
              value={whatsappPhone}
              onChange={(e) => setWhatsappPhone(e.target.value)}
              inputSize="lg"
              required
              requiredLabel={tCommon("required")}
            />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="min-w-0 space-y-2">
                <Label htmlFor="dateOfBirth">{t("fields.dateOfBirth")}</Label>
                <div className="relative">
                  <Cake className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="dateOfBirth" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} inputSize="lg" className="pl-9" />
                </div>
              </div>
              <div className="min-w-0 space-y-2">
                <Label htmlFor="gender">{t("fields.gender")}</Label>
                <Select value={gender} onValueChange={(v) => setGender((v as Gender) ?? "")} items={genderItems}>
                  <SelectTrigger id="gender" size="lg" className="w-full">
                    <UserRound className="size-4 text-muted-foreground" />
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
            </div>
          </section>

          {mode === "edit" && (
            <section className="space-y-4">
              {familyId ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="min-w-0 space-y-2">
                    <Label htmlFor="familyId">{t("fields.family")}</Label>
                    <Select
                      value={familyId || NO_FAMILY_VALUE}
                      onValueChange={(v) => setFamilyId(v === NO_FAMILY_VALUE ? "" : (v ?? ""))}
                      items={Object.fromEntries([[NO_FAMILY_VALUE, t("fields.noFamily")], ...families.map((f) => [f.id, f.familyName])])}
                    >
                      <SelectTrigger id="familyId" size="lg" className="w-full">
                        <Users className="size-4 text-muted-foreground" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_FAMILY_VALUE}>{t("fields.noFamily")}</SelectItem>
                        {families.map((family) => (
                          <SelectItem key={family.id} value={family.id}>
                            {family.familyName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <LabeledInput id="address" label={t("fields.address")} value={address} onChange={(e) => setAddress(e.target.value)} inputSize="lg" />
                </div>
              ) : (
                <>
                  <section className="space-y-4 rounded-lg border p-4">
                    <div>
                      <h3 className="text-sm font-semibold">{t("familySection.title")}</h3>
                      <p className="text-xs text-muted-foreground">{t("familySection.description")}</p>
                    </div>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                      {(["none", "existing", "new"] as const).map((value) => (
                        <Button
                          key={value}
                          type="button"
                          variant={familyMode === value ? "default" : "outline"}
                          onClick={() => setFamilyMode(value)}
                        >
                          {t(`familySection.modes.${value}`)}
                        </Button>
                      ))}
                    </div>

                    {familyMode === "existing" && (
                      <div className="space-y-4">
                        <div className="space-y-3">
                          <Label htmlFor="editSelectedFamilyId">{t("familySection.existingFamily")}</Label>
                          {families.find((f) => f.id === selectedFamilyId) ? (
                            <div className="relative rounded-lg border border-primary bg-primary/5 p-3 pr-12">
                              <FamilySummary family={families.find((f) => f.id === selectedFamilyId)!} t={t} />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={clearSelectedFamily}
                                aria-label={t("familySection.clearFamily")}
                                className="absolute top-2 right-2 max-md:size-11"
                              >
                                <X className="size-4" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <div className="relative">
                                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                  id="editSelectedFamilyId"
                                  value={familySearch}
                                  onChange={(e) => {
                                    const nextSearch = e.target.value;
                                    setFamilySearch(nextSearch);
                                    if (!nextSearch.trim()) {
                                      setFamilies([]);
                                      setSearchingFamilies(false);
                                    }
                                  }}
                                  placeholder={t("familySection.existingFamilyPlaceholder")}
                                  inputSize="lg"
                                  className="pl-9"
                                />
                              </div>
                              <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border p-2">
                                {!familySearch.trim() ? (
                                  <p className="px-2 py-3 text-sm text-muted-foreground">{t("familySection.typeToSearchFamilies")}</p>
                                ) : searchingFamilies ? (
                                  <p className="px-2 py-3 text-sm text-muted-foreground">{tCommon("loading")}</p>
                                ) : families.length === 0 ? (
                                  <p className="px-2 py-3 text-sm text-muted-foreground">{t("familySection.noFamiliesFound")}</p>
                                ) : (
                                  families.map((family) => (
                                    <FamilySummaryButton
                                      key={family.id}
                                      family={family}
                                      selected={family.id === selectedFamilyId}
                                      onSelect={() => selectExistingFamily(family)}
                                      t={t}
                                    />
                                  ))
                                )}
                              </div>
                            </>
                          )}
                        </div>
                        {families.find((f) => f.id === selectedFamilyId) && (
                          <RelationshipSelect
                            id="editPrimaryRelationshipExisting"
                            value={primaryRelationship}
                            onChange={setPrimaryRelationship}
                            label={t("familySection.primaryRelationship")}
                            placeholder={t("familySection.relationshipPlaceholder")}
                            relationshipItems={relationshipItems}
                            disabledRelationships={families.find((f) => f.id === selectedFamilyId)?.primaryDevoteeId ? ["head_of_family"] : []}
                            tRelationship={tRelationship}
                          />
                        )}
                      </div>
                    )}

                    {familyMode === "new" && (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <LabeledInput id="editFamilyName" label={t("familySection.familyName")} value={familyName} onChange={(e) => setFamilyName(e.target.value)} inputSize="lg" required />
                        <RelationshipSelect
                          id="editPrimaryRelationshipNew"
                          value={primaryRelationship}
                          onChange={setPrimaryRelationship}
                          label={t("familySection.primaryRelationship")}
                          placeholder={t("familySection.relationshipPlaceholder")}
                          relationshipItems={relationshipItems}
                          tRelationship={tRelationship}
                        />
                        <LabeledInput id="editFamilyAddress" label={t("familySection.address")} value={familyAddress} onChange={(e) => setFamilyAddress(e.target.value)} inputSize="lg" />
                        <LabeledInput id="editFamilyCity" label={t("familySection.city")} value={familyCity} onChange={(e) => setFamilyCity(e.target.value)} inputSize="lg" />
                        <LabeledInput id="editFamilyState" label={t("familySection.state")} value={familyState} onChange={(e) => setFamilyState(e.target.value)} inputSize="lg" />
                        <LabeledInput id="editFamilyPincode" label={t("familySection.pincode")} value={familyPincode} onChange={(e) => setFamilyPincode(e.target.value)} inputSize="lg" />
                      </div>
                    )}
                  </section>
                  <LabeledInput id="address" label={t("fields.address")} value={address} onChange={(e) => setAddress(e.target.value)} inputSize="lg" />
                </>
              )}
            </section>
          )}

          <section className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <LabeledInput id="birthStar" label={t("fields.birthStar")} placeholder={t("fields.birthStarPlaceholder")} icon={<Sparkles />} value={birthStar} onChange={(e) => setBirthStar(e.target.value)} inputSize="lg" />
              <LabeledInput id="ancestralLineage" label={t("fields.gothram")} placeholder={t("fields.gothramPlaceholder")} icon={<Users />} value={ancestralLineage} onChange={(e) => setAncestralLineage(e.target.value)} inputSize="lg" />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="min-w-0 space-y-2">
                <Label htmlFor="maritalStatus">{t("fields.maritalStatus")}</Label>
                <Select value={maritalStatus || undefined} onValueChange={(v) => setMaritalStatus((v as MaritalStatus) ?? "")} items={maritalStatusItems}>
                  <SelectTrigger id="maritalStatus" size="lg" className="w-full">
                    <Heart className="size-4 text-muted-foreground" />
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
              <div className="min-w-0 space-y-2">
                <Label htmlFor="weddingAnniversary">{t("fields.weddingAnniversary")}</Label>
                <div className="relative">
                  <Heart className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="weddingAnniversary" type="date" value={weddingAnniversary} onChange={(e) => setWeddingAnniversary(e.target.value)} inputSize="lg" className="pl-9" />
                </div>
              </div>
            </div>
            {mode === "create" && (
              <section className="space-y-4 rounded-lg border p-4">
                <div>
                  <h3 className="text-sm font-semibold">{t("familySection.title")}</h3>
                  <p className="text-xs text-muted-foreground">{t("familySection.description")}</p>
                </div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                  {(["none", "existing", "new"] as const).map((value) => (
                    <Button
                      key={value}
                      type="button"
                      variant={familyMode === value ? "default" : "outline"}
                      onClick={() => setFamilyMode(value)}
                    >
                      {t(`familySection.modes.${value}`)}
                    </Button>
                  ))}
                </div>

                {familyMode === "existing" && (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <Label htmlFor="selectedFamilyId">{t("familySection.existingFamily")}</Label>
                      {selectedFamily ? (
                        <div className="relative rounded-lg border border-primary bg-primary/5 p-3 pr-12">
                          <FamilySummary family={selectedFamily} t={t} />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={clearSelectedFamily}
                            aria-label={t("familySection.clearFamily")}
                            className="absolute top-2 right-2 max-md:size-11"
                          >
                            <X className="size-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="relative">
                            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              id="selectedFamilyId"
                              value={familySearch}
                              onChange={(e) => {
                                const nextSearch = e.target.value;
                                setFamilySearch(nextSearch);
                                if (!nextSearch.trim()) {
                                  setFamilies([]);
                                  setSearchingFamilies(false);
                                }
                              }}
                              placeholder={t("familySection.existingFamilyPlaceholder")}
                              inputSize="lg"
                              className="pl-9"
                            />
                          </div>
                          <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border p-2">
                            {!familySearch.trim() ? (
                              <p className="px-2 py-3 text-sm text-muted-foreground">{t("familySection.typeToSearchFamilies")}</p>
                            ) : searchingFamilies ? (
                              <p className="px-2 py-3 text-sm text-muted-foreground">{tCommon("loading")}</p>
                            ) : families.length === 0 ? (
                              <p className="px-2 py-3 text-sm text-muted-foreground">{t("familySection.noFamiliesFound")}</p>
                            ) : (
                              families.map((family) => (
                                <FamilySummaryButton
                                  key={family.id}
                                  family={family}
                                  selected={family.id === selectedFamilyId}
                                  onSelect={() => selectExistingFamily(family)}
                                  t={t}
                                />
                              ))
                            )}
                          </div>
                        </>
                      )}
                    </div>
                    {selectedFamily && (
                      <div className="space-y-3">
                        <RelationshipSelect
                          id="primaryRelationshipExisting"
                          value={primaryRelationship}
                          onChange={setPrimaryRelationship}
                          label={t("familySection.primaryRelationship")}
                          placeholder={t("familySection.relationshipPlaceholder")}
                          relationshipItems={relationshipItems}
                          disabledRelationships={selectedFamily.primaryDevoteeId ? ["head_of_family"] : []}
                          tRelationship={tRelationship}
                        />
                      </div>
                    )}
                  </div>
                )}

                {familyMode === "new" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <LabeledInput id="familyName" label={t("familySection.familyName")} value={familyName} onChange={(e) => setFamilyName(e.target.value)} inputSize="lg" required />
                      <RelationshipSelect
                        id="primaryRelationshipNew"
                        value={primaryRelationship}
                        onChange={updatePrimaryRelationship}
                        label={t("familySection.primaryRelationship")}
                        placeholder={t("familySection.relationshipPlaceholder")}
                        relationshipItems={relationshipItems}
                        tRelationship={tRelationship}
                      />
                      <LabeledInput id="familyAddress" label={t("familySection.address")} value={familyAddress} onChange={(e) => setFamilyAddress(e.target.value)} inputSize="lg" />
                      <LabeledInput id="familyCity" label={t("familySection.city")} value={familyCity} onChange={(e) => setFamilyCity(e.target.value)} inputSize="lg" />
                      <LabeledInput id="familyState" label={t("familySection.state")} value={familyState} onChange={(e) => setFamilyState(e.target.value)} inputSize="lg" />
                      <LabeledInput id="familyPincode" label={t("familySection.pincode")} value={familyPincode} onChange={(e) => setFamilyPincode(e.target.value)} inputSize="lg" />
                    </div>
                    {similarFamilies.length > 0 && (
                      <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-950">
                        <p className="text-sm font-medium">{t("familySection.similarFamiliesTitle")}</p>
                        <div className="space-y-2">
                          {similarFamilies.map((family) => (
                            <FamilySummaryButton
                              key={family.id}
                              family={family}
                              selected={false}
                              onSelect={() => {
                                setFamilyMode("existing");
                                selectExistingFamily(family);
                                setFamilySearch(family.familyName);
                              }}
                              t={t}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Label>{t("familySection.members")}</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          onClick={() => setMembers((prev) => [...prev, { localId: localId(), kind: "new", displayName: "", whatsappPhone: "", relationship: "" }])}
                        >
                          <Plus className="size-4" />
                          {t("familySection.addNewMember")}
                        </Button>
                      </div>
                      <div className="flex flex-col gap-2 md:flex-row">
                        <Input value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} placeholder={t("familySection.searchExistingPlaceholder")} inputSize="lg" className="flex-1" />
                        <Button type="button" variant="outline" className="shrink-0" onClick={searchExistingMembers} disabled={searchingMembers}>
                          <Search className="size-4" />
                          {searchingMembers ? tCommon("loading") : t("familySection.search")}
                        </Button>
                      </div>
                      {memberSearchResults.length > 0 && (
                        <div className="space-y-2 rounded-lg border p-2">
                          {memberSearchResults.map((result) => (
                            <button
                              key={result.id}
                              type="button"
                              onClick={() => addExistingMember(result)}
                              className="flex w-full items-center justify-between gap-3 rounded-md p-2 text-left hover:bg-muted"
                            >
                              <span>
                                <span className="block text-sm font-medium">{result.displayName}</span>
                                <span className="block text-xs text-muted-foreground">{result.familyName ?? result.whatsappPhone ?? t("familySection.noPhone")}</span>
                              </span>
                              <Plus className="size-4 text-muted-foreground" />
                            </button>
                          ))}
                        </div>
                      )}
                      {members.map((member) => (
                        <div key={member.localId} className="space-y-3 rounded-lg border p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium">{member.kind === "existing" ? member.devotee.displayName : t("familySection.newMember")}</p>
                              {member.kind === "existing" && member.devotee.familyName && (
                                <p className="text-xs text-muted-foreground">{t("familySection.currentFamily", { family: member.devotee.familyName })}</p>
                              )}
                            </div>
                            <Button type="button" variant="ghost" size="icon-sm" className="max-md:size-11" onClick={() => removeMember(member.localId)} aria-label={t("familySection.removeMember")}>
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </div>
                          {member.kind === "new" && (
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                              <Input value={member.displayName} onChange={(e) => updateMember(member.localId, { displayName: e.target.value })} placeholder={t("familySection.memberName")} required />
                              <Input value={member.whatsappPhone} onChange={(e) => updateMember(member.localId, { whatsappPhone: e.target.value })} placeholder={t("familySection.memberPhone")} />
                            </div>
                          )}
                          <RelationshipSelect
                            id={`member-${member.localId}-relationship`}
                            value={member.relationship}
                            onChange={(relationship) => updateMemberRelationship(member.localId, relationship)}
                            label={t("familySection.relationship")}
                            placeholder={t("familySection.relationshipPlaceholder")}
                            relationshipItems={relationshipItems}
                            tRelationship={tRelationship}
                          />
                          {member.kind === "existing" && member.devotee.familyId && (
                            <label className="flex items-start gap-2 text-sm">
                              <Checkbox className="mt-0.5 shrink-0" checked={member.moveFromExistingFamily} onCheckedChange={(checked) => updateMember(member.localId, { moveFromExistingFamily: checked === true })} />
                              {t("familySection.confirmMove")}
                            </label>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{t("whatsappStatus.label")}</p>
                  <p className="text-xs text-muted-foreground">{t("whatsappStatus.description")}</p>
                </div>
              </div>
              <Switch checked={whatsappOptInStatus} onCheckedChange={setWhatsappOptInStatus} />
            </div>
            {mode === "edit" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="preferredLanguage">{t("fields.preferredLanguage")}</Label>
                  <Select value={preferredLanguage || undefined} onValueChange={(v) => setPreferredLanguage((v as SupportedLanguage) ?? "")} items={{ en: t("languageOptions.en"), te: t("languageOptions.te") }}>
                    <SelectTrigger id="preferredLanguage" size="lg" className="w-full">
                      <SelectValue placeholder={t("fields.preferredLanguagePlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">{t("languageOptions.en")}</SelectItem>
                      <SelectItem value="te">{t("languageOptions.te")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">{t("fields.notes")}</Label>
                  <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <Bell className="size-4 text-saffron" />
                    <div>
                      <p className="text-sm font-medium">{t("eventNotifications.label")}</p>
                      <p className="text-xs text-muted-foreground">{t("eventNotifications.description")}</p>
                    </div>
                  </div>
                  <Switch checked={eventNotificationsEnabled} onCheckedChange={setEventNotificationsEnabled} />
                </div>
              </>
            )}
          </section>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" size="xl" disabled={submitting}>
              {submitting ? tCommon("saving") : tCommon("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function familyLocation(family: DevoteeFamilySummary) {
  return [family.address, family.city, family.state, family.pincode].filter(Boolean).join(", ");
}

function FamilySummaryButton({
  family,
  selected,
  onSelect,
  t,
}: {
  family: DevoteeFamilySummary;
  selected: boolean;
  onSelect: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-md border p-3 text-left transition hover:bg-muted ${
        selected ? "border-primary bg-primary/5" : "border-transparent"
      }`}
    >
      <FamilySummary family={family} t={t} />
    </button>
  );
}

function FamilySummary({ family, t }: { family: DevoteeFamilySummary; t: ReturnType<typeof useTranslations> }) {
  const location = familyLocation(family);
  const memberPreview = family.memberNames.slice(0, 2).join(", ");
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{family.familyName}</p>
        <span className="shrink-0 text-xs text-muted-foreground">
          {t("familySection.memberCount", { count: family.memberCount })}
        </span>
      </div>
      <div className="grid gap-1 text-xs text-muted-foreground">
        {family.primaryDevoteeName && (
          <span className="flex items-center gap-1.5">
            <User className="size-3.5" />
            {t("familySection.headSummary", { name: family.primaryDevoteeName })}
          </span>
        )}
        {location && (
          <span className="flex items-center gap-1.5">
            <MapPin className="size-3.5" />
            {location}
          </span>
        )}
        {family.primaryDevoteePhone && (
          <span className="flex items-center gap-1.5">
            <Phone className="size-3.5" />
            {family.primaryDevoteePhone}
          </span>
        )}
        {memberPreview && (
          <span className="flex items-center gap-1.5">
            <Users className="size-3.5" />
            {memberPreview}
          </span>
        )}
      </div>
    </div>
  );
}

function RelationshipSelect({
  id,
  value,
  onChange,
  label,
  placeholder,
  relationshipItems,
  disabledRelationships = [],
  tRelationship,
}: {
  id: string;
  value: RelationshipCode | "";
  onChange: (value: RelationshipCode | "") => void;
  label: string;
  placeholder: string;
  relationshipItems: Record<string, string>;
  disabledRelationships?: RelationshipCode[];
  tRelationship: ReturnType<typeof useTranslations>;
}) {
  const disabledRelationshipSet = new Set(disabledRelationships);
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value || undefined} onValueChange={(v) => onChange((v as RelationshipCode) ?? "")} items={relationshipItems}>
        <SelectTrigger id={id} size="lg" className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {RELATIONSHIP_CODES.map((relationship) => (
            <SelectItem key={relationship} value={relationship} disabled={disabledRelationshipSet.has(relationship)}>
              {tRelationship(relationship)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
