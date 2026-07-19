"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Tenant } from "@/types/db";
import {
  buildUpdateTemplePayload,
  formErrorsFromTempleUpdateApiError,
  type TempleDetailEditFormErrors,
  type TempleDetailEditFormState,
} from "./temple-detail-edit-form-helpers";
import type { SuperAdminTenantDetail } from "@/lib/db/tenants";

const emptyErrors: TempleDetailEditFormErrors = { fieldErrors: {} };

interface TempleDetailEditFormProps {
  tenant: Tenant;
}

export function TempleDetailEditForm({ tenant }: TempleDetailEditFormProps) {
  const router = useRouter();
  const tenantFormKey = formKeyFromTenant(tenant);
  const [{ formKey, form: storedForm }, setFormState] = useState(() => ({
    formKey: tenantFormKey,
    form: formStateFromTenant(tenant),
  }));
  const [errors, setErrors] = useState<TempleDetailEditFormErrors>(emptyErrors);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [saved, setSaved] = useState(false);

  const form = formKey === tenantFormKey ? storedForm : formStateFromTenant(tenant);
  if (formKey !== tenantFormKey) {
    setFormState({ formKey: tenantFormKey, form });
  }

  function updateField<K extends keyof TempleDetailEditFormState>(
    field: K,
    value: TempleDetailEditFormState[K],
  ) {
    setFormState((current) => ({
      ...current,
      form: { ...current.form, [field]: value },
    }));
    setErrors(emptyErrors);
    setSaved(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;

    submittingRef.current = true;
    setSubmitting(true);
    setSaved(false);
    setErrors(emptyErrors);

    try {
      const response = await fetch(`/api/super-admin/temples/${tenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildUpdateTemplePayload(form)),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setErrors(formErrorsFromTempleUpdateApiError(body));
        return;
      }
      if (isTempleUpdateSuccess(body)) {
        setFormState({
          formKey: formKeyFromTenant(body.temple.tenant),
          form: formStateFromTenant(body.temple.tenant),
        });
      }
      setSaved(true);
      router.refresh();
    } catch {
      setErrors({ fieldErrors: {}, formError: "Temple update failed." });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-4">
      <div className="flex flex-col gap-3 border-b pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-normal">Edit Temple Details</h2>
          <p className="text-sm text-muted-foreground">Safe tenant setup fields only.</p>
        </div>
        <Button type="submit" disabled={submitting}>
          <Save className="size-4" />
          {submitting ? "Saving..." : "Save"}
        </Button>
      </div>

      {errors.formError && (
        <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errors.formError}
        </p>
      )}
      {saved && (
        <p className="mt-4 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Temple details updated.
        </p>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <FieldError label="Temple name" id="edit-temple-name" error={errors.fieldErrors.name}>
          <Input
            id="edit-temple-name"
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            required
          />
        </FieldError>
        <FieldError label="Contact phone" id="edit-contact-phone" error={errors.fieldErrors.defaultContactPhone}>
          <Input
            id="edit-contact-phone"
            value={form.defaultContactPhone}
            onChange={(event) => updateField("defaultContactPhone", event.target.value)}
            placeholder="+1 415 555 2671"
          />
        </FieldError>
        <FieldError label="Timezone" id="edit-timezone" error={errors.fieldErrors.timezone}>
          <Input
            id="edit-timezone"
            value={form.timezone}
            onChange={(event) => updateField("timezone", event.target.value)}
            required
          />
        </FieldError>
        <FieldError label="Address" id="edit-address" error={errors.fieldErrors.address} className="md:col-span-2">
          <Textarea
            id="edit-address"
            value={form.address}
            onChange={(event) => updateField("address", event.target.value)}
            rows={3}
          />
        </FieldError>
      </div>
    </form>
  );
}

function formStateFromTenant(tenant: Tenant): TempleDetailEditFormState {
  return {
    name: tenant.name,
    defaultContactPhone: tenant.defaultContactPhone ?? "",
    address: tenant.address ?? "",
    timezone: tenant.timezone,
  };
}

function formKeyFromTenant(tenant: Tenant): string {
  return [
    tenant.name,
    tenant.defaultContactPhone ?? "",
    tenant.address ?? "",
    tenant.timezone,
  ].join("\u0000");
}

function isTempleUpdateSuccess(value: unknown): value is { temple: SuperAdminTenantDetail } {
  return (
    typeof value === "object" &&
    value !== null &&
    "temple" in value &&
    typeof value.temple === "object" &&
    value.temple !== null &&
    "tenant" in value.temple
  );
}

function FieldError({
  label,
  id,
  error,
  className,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={["space-y-2", className].filter(Boolean).join(" ")}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
