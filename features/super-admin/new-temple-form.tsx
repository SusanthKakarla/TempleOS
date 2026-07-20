"use client";

import { useMemo, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Globe2,
  Landmark,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { fadeInUp, springSnappy } from "@/lib/motion";
import {
  DEFAULT_NEW_TEMPLE_FORM_STATE,
  ROLE_OPTIONS,
  buildProvisionTemplePayload,
  formErrorsFromApiError,
  fullHostnamePreview,
  normalizeSubdomainInput,
  type NewTempleFormErrors,
  type NewTempleFormState,
  type ProvisionTempleSuccess,
} from "./new-temple-form-helpers";
import type { RoleCode } from "@/types/db";

const emptyErrors: NewTempleFormErrors = { fieldErrors: {}, sectionErrors: {} };

const STEPS = [
  { key: "temple", title: "Temple", icon: Landmark },
  { key: "domain", title: "Domain", icon: Globe2 },
  { key: "firstMember", title: "First Member", icon: UserRound },
  { key: "whatsapp", title: "WhatsApp", icon: ShieldCheck },
] as const;

export function NewTempleForm() {
  const [form, setForm] = useState<NewTempleFormState>(DEFAULT_NEW_TEMPLE_FORM_STATE);
  const [errors, setErrors] = useState<NewTempleFormErrors>(emptyErrors);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<ProvisionTempleSuccess["temple"] | null>(null);
  const [step, setStep] = useState(0);
  const hostname = useMemo(() => fullHostnamePreview(form.subdomain), [form.subdomain]);

  function updateField<K extends keyof NewTempleFormState>(field: K, value: NewTempleFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors(emptyErrors);
  }

  function updateSlugField(field: "tenantSlug" | "subdomain", value: string) {
    updateField(field, normalizeSubdomainInput(value));
  }

  function toggleRole(role: RoleCode) {
    if (role === "admin") return;
    setForm((current) => ({
      ...current,
      firstMemberRoles: current.firstMemberRoles.includes(role)
        ? current.firstMemberRoles.filter((item) => item !== role)
        : [...current.firstMemberRoles, role],
    }));
    setErrors(emptyErrors);
  }

  /** Lightweight required-field presence check to gate step advancement — does not replace buildProvisionTemplePayload's real validation, which still runs unchanged on final submit. */
  function canAdvance(fromStep: number): boolean {
    if (fromStep === 0) {
      return form.templeName.trim() !== "" && form.tenantSlug.trim() !== "" && form.timezone.trim() !== "";
    }
    if (fromStep === 1) {
      return form.subdomain.trim() !== "";
    }
    if (fromStep === 2) {
      return form.firstMemberPhone.trim() !== "" && form.firstMemberDisplayName.trim() !== "";
    }
    return true;
  }

  function goNext() {
    if (!canAdvance(step)) return;
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }

  function goBack() {
    setStep((current) => Math.max(current - 1, 0));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreated(null);

    const built = buildProvisionTemplePayload(form);
    if (!built.ok) {
      setErrors({ fieldErrors: built.fieldErrors, sectionErrors: built.sectionErrors });
      return;
    }

    setSubmitting(true);
    setErrors(emptyErrors);
    try {
      const response = await fetch("/api/super-admin/temples", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(built.payload),
      });
      const body = (await response.json().catch(() => null)) as ProvisionTempleSuccess | unknown;
      if (!response.ok) {
        setErrors(formErrorsFromApiError(body));
        return;
      }
      if (!isProvisionTempleSuccess(body)) {
        setErrors({ fieldErrors: {}, sectionErrors: { form: "Temple provisioning failed." } });
        return;
      }
      setCreated(body.temple);
    } catch {
      setErrors({ fieldErrors: {}, sectionErrors: { form: "Temple provisioning failed." } });
    } finally {
      setSubmitting(false);
    }
  }

  const isLastStep = step === STEPS.length - 1;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="glass-card flex items-center gap-1 rounded-2xl p-1.5">
          {STEPS.map((s, index) => {
            const Icon = s.icon;
            const isActive = index === step;
            const isDone = index < step;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => index <= step && setStep(index)}
                disabled={index > step}
                className={cn(
                  "relative flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed",
                  isActive ? "text-primary-foreground" : isDone ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="new-temple-step-indicator"
                    className="gradient-ocean-blue absolute inset-0 rounded-xl"
                    transition={springSnappy}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Icon className="size-4" />
                  <span className="hidden sm:inline">{s.title}</span>
                </span>
              </button>
            );
          })}
        </div>

        {errors.sectionErrors.form && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errors.sectionErrors.form}
          </p>
        )}

        <motion.div key={step} initial="hidden" animate="show" variants={fadeInUp} transition={{ duration: 0.2 }}>
          {step === 0 && (
            <Card className="glass-card rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Landmark className="size-4 text-primary" />
                  Temple
                </CardTitle>
                <CardDescription>Core tenant record and contact details.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <FloatingLabelInput
                  id="temple-name"
                  label="Temple name"
                  error={errors.fieldErrors.templeName}
                  value={form.templeName}
                  onChange={(event) => updateField("templeName", event.target.value)}
                  required
                />
                <FloatingLabelInput
                  id="tenant-slug"
                  label="Tenant slug"
                  error={errors.fieldErrors.tenantSlug}
                  value={form.tenantSlug}
                  onChange={(event) => updateSlugField("tenantSlug", event.target.value)}
                  required
                />
                <FloatingLabelInput
                  id="contact-phone"
                  label="Contact phone"
                  icon={<Phone />}
                  error={errors.fieldErrors.contactPhone}
                  value={form.contactPhone}
                  onChange={(event) => updateField("contactPhone", event.target.value)}
                />
                <FloatingLabelInput
                  id="timezone"
                  label="Timezone"
                  error={errors.fieldErrors.timezone}
                  value={form.timezone}
                  onChange={(event) => updateField("timezone", event.target.value)}
                  required
                />
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={form.address}
                    onChange={(event) => updateField("address", event.target.value)}
                    rows={3}
                  />
                  {errors.fieldErrors.address && (
                    <p className="text-sm text-destructive">{errors.fieldErrors.address}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {step === 1 && (
            <Card className="glass-card rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Globe2 className="size-4 text-primary" />
                  Domain
                </CardTitle>
                <CardDescription>Subdomain for tenant login and routing.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FloatingLabelInput
                  id="subdomain"
                  label="Subdomain slug"
                  error={errors.fieldErrors.subdomain}
                  value={form.subdomain}
                  onChange={(event) => updateSlugField("subdomain", event.target.value)}
                  required
                />
                <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Hostname preview: </span>
                  <span className="font-medium">{hostname || "Enter a subdomain"}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card className="glass-card rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <UserRound className="size-4 text-primary" />
                  First Member
                </CardTitle>
                <CardDescription>Initial tenant member created by provisioning.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <FloatingLabelInput
                    id="first-member-phone"
                    label="Phone number"
                    error={errors.fieldErrors.firstMemberPhone}
                    value={form.firstMemberPhone}
                    onChange={(event) => updateField("firstMemberPhone", event.target.value)}
                    required
                  />
                  <FloatingLabelInput
                    id="first-member-display-name"
                    label="Display name"
                    error={errors.fieldErrors.firstMemberDisplayName}
                    value={form.firstMemberDisplayName}
                    onChange={(event) => updateField("firstMemberDisplayName", event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Roles</Label>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {ROLE_OPTIONS.map((role) => (
                      <label
                        key={role.code}
                        className="flex min-h-10 items-center gap-2 rounded-md border px-3 py-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={form.firstMemberRoles.includes(role.code)}
                          disabled={role.code === "admin"}
                          onChange={() => toggleRole(role.code)}
                          className="size-4"
                        />
                        <span>{role.label}</span>
                      </label>
                    ))}
                  </div>
                  {errors.fieldErrors.firstMemberRoles && (
                    <p className="text-sm text-destructive">{errors.fieldErrors.firstMemberRoles}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card className="glass-card rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShieldCheck className="size-4 text-primary" />
                  WhatsApp
                </CardTitle>
                <CardDescription>Optional provisioning-time linkage details.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <FloatingLabelInput
                  id="whatsapp-phone"
                  label="WhatsApp phone"
                  error={errors.fieldErrors.whatsappPhoneNumber}
                  value={form.whatsappPhoneNumber}
                  onChange={(event) => updateField("whatsappPhoneNumber", event.target.value)}
                />
                <FloatingLabelInput
                  id="meta-phone-number-id"
                  label="Meta phone number ID"
                  error={errors.fieldErrors.metaPhoneNumberId}
                  value={form.metaPhoneNumberId}
                  onChange={(event) => updateField("metaPhoneNumberId", event.target.value)}
                />
                <FloatingLabelInput
                  id="meta-business-account-id"
                  label="Meta business account ID"
                  error={errors.fieldErrors.metaBusinessAccountId}
                  value={form.metaBusinessAccountId}
                  onChange={(event) => updateField("metaBusinessAccountId", event.target.value)}
                />
                {errors.sectionErrors.whatsappAccount && (
                  <p className="text-sm text-destructive md:col-span-3">{errors.sectionErrors.whatsappAccount}</p>
                )}
              </CardContent>
            </Card>
          )}
        </motion.div>

        <div className="flex items-center justify-between gap-2">
          <Button type="button" variant="outline" onClick={goBack} disabled={step === 0} className="gap-1.5">
            <ArrowLeft className="size-4" />
            Back
          </Button>
          {isLastStep ? (
            <Button type="submit" disabled={submitting}>
              {submitting ? "Provisioning..." : "Provision temple"}
            </Button>
          ) : (
            <Button type="button" onClick={goNext} disabled={!canAdvance(step)} className="gap-1.5">
              Next
              <ArrowRight className="size-4" />
            </Button>
          )}
        </div>
      </form>

      <aside className="space-y-4">
        {created ? (
          <Card className="glass-card rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle2 className="size-4 text-emerald-600" />
                Created
              </CardTitle>
              <CardDescription>The API returned the canonical provisioned summary.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <SummaryRow label="Temple" value={created.tenant.name} />
              <SummaryRow label="Subdomain" value={created.domain.hostname} />
              <SummaryRow label="First member" value={created.firstMember.displayName} />
              <SummaryRow label="Roles" value={created.roles.join(", ")} />
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">WhatsApp</span>
                <Badge variant="outline">{created.whatsappAccount ? "Linked" : "Unlinked"}</Badge>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="glass-card rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg">Provisioning Summary</CardTitle>
              <CardDescription>Created temple details will appear here after the API succeeds.</CardDescription>
            </CardHeader>
          </Card>
        )}
      </aside>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function isProvisionTempleSuccess(value: unknown): value is ProvisionTempleSuccess {
  return (
    typeof value === "object" &&
    value !== null &&
    "temple" in value &&
    typeof value.temple === "object" &&
    value.temple !== null
  );
}
