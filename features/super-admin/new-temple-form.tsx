"use client";

import { useMemo, useState, type FormEvent } from "react";
import { CheckCircle2, Globe2, Landmark, Phone, ShieldCheck, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

export function NewTempleForm() {
  const [form, setForm] = useState<NewTempleFormState>(DEFAULT_NEW_TEMPLE_FORM_STATE);
  const [errors, setErrors] = useState<NewTempleFormErrors>(emptyErrors);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<ProvisionTempleSuccess["temple"] | null>(null);
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

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <form onSubmit={handleSubmit} className="space-y-5">
        {errors.sectionErrors.form && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errors.sectionErrors.form}
          </p>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Landmark className="size-4 text-primary" />
              Temple
            </CardTitle>
            <CardDescription>Core tenant record and contact details.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FieldError label="Temple name" id="temple-name" error={errors.fieldErrors.templeName}>
              <Input
                id="temple-name"
                value={form.templeName}
                onChange={(event) => updateField("templeName", event.target.value)}
                required
              />
            </FieldError>
            <FieldError label="Tenant slug" id="tenant-slug" error={errors.fieldErrors.tenantSlug}>
              <Input
                id="tenant-slug"
                value={form.tenantSlug}
                onChange={(event) => updateSlugField("tenantSlug", event.target.value)}
                placeholder="sv-temple"
                required
              />
            </FieldError>
            <FieldError label="Contact phone" id="contact-phone" error={errors.fieldErrors.contactPhone}>
              <div className="relative">
                <Phone className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="contact-phone"
                  value={form.contactPhone}
                  onChange={(event) => updateField("contactPhone", event.target.value)}
                  placeholder="+1 415 555 2671"
                  className="pl-9"
                />
              </div>
            </FieldError>
            <FieldError label="Timezone" id="timezone" error={errors.fieldErrors.timezone}>
              <Input
                id="timezone"
                value={form.timezone}
                onChange={(event) => updateField("timezone", event.target.value)}
                required
              />
            </FieldError>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={form.address}
                onChange={(event) => updateField("address", event.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe2 className="size-4 text-primary" />
              Domain
            </CardTitle>
            <CardDescription>Subdomain for tenant login and routing.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FieldError label="Subdomain slug" id="subdomain" error={errors.fieldErrors.subdomain}>
              <Input
                id="subdomain"
                value={form.subdomain}
                onChange={(event) => updateSlugField("subdomain", event.target.value)}
                placeholder="svtemple"
                required
              />
            </FieldError>
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Hostname preview: </span>
              <span className="font-medium">{hostname || "Enter a subdomain"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserRound className="size-4 text-primary" />
              First Member
            </CardTitle>
            <CardDescription>Initial tenant member created by provisioning.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FieldError label="Phone number" id="first-member-phone" error={errors.fieldErrors.firstMemberPhone}>
                <Input
                  id="first-member-phone"
                  value={form.firstMemberPhone}
                  onChange={(event) => updateField("firstMemberPhone", event.target.value)}
                  placeholder="+1 415 555 2672"
                  required
                />
              </FieldError>
              <FieldError label="Display name" id="first-member-display-name" error={errors.fieldErrors.firstMemberDisplayName}>
                <Input
                  id="first-member-display-name"
                  value={form.firstMemberDisplayName}
                  onChange={(event) => updateField("firstMemberDisplayName", event.target.value)}
                  required
                />
              </FieldError>
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="size-4 text-primary" />
              WhatsApp
            </CardTitle>
            <CardDescription>Optional provisioning-time linkage details.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <FieldError label="WhatsApp phone" id="whatsapp-phone" error={errors.fieldErrors.whatsappPhoneNumber}>
              <Input
                id="whatsapp-phone"
                value={form.whatsappPhoneNumber}
                onChange={(event) => updateField("whatsappPhoneNumber", event.target.value)}
                placeholder="+1 415 555 2673"
              />
            </FieldError>
            <FieldError label="Meta phone number ID" id="meta-phone-number-id" error={errors.fieldErrors.metaPhoneNumberId}>
              <Input
                id="meta-phone-number-id"
                value={form.metaPhoneNumberId}
                onChange={(event) => updateField("metaPhoneNumberId", event.target.value)}
              />
            </FieldError>
            <FieldError label="Meta business account ID" id="meta-business-account-id" error={errors.fieldErrors.metaBusinessAccountId}>
              <Input
                id="meta-business-account-id"
                value={form.metaBusinessAccountId}
                onChange={(event) => updateField("metaBusinessAccountId", event.target.value)}
              />
            </FieldError>
            {errors.sectionErrors.whatsappAccount && (
              <p className="text-sm text-destructive md:col-span-3">{errors.sectionErrors.whatsappAccount}</p>
            )}
          </CardContent>
        </Card>

        <Button type="submit" disabled={submitting}>
          {submitting ? "Provisioning..." : "Provision temple"}
        </Button>
      </form>

      <aside className="space-y-4">
        {created ? (
          <Card>
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
          <Card>
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

function FieldError({
  label,
  id,
  error,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
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
