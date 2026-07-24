"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LabeledInput } from "@/components/ui/labeled-input";
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
      <div className="border-b pb-3">
        <h2 className="text-base font-semibold tracking-normal">Edit Temple Details</h2>
        <p className="text-sm text-muted-foreground">Safe tenant setup fields only.</p>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <LabeledInput
          id="edit-temple-name"
          label="Temple name"
          error={errors.fieldErrors.name}
          value={form.name}
          onChange={(event) => updateField("name", event.target.value)}
          required
        />
        <LabeledInput
          id="edit-contact-phone"
          label="Contact phone"
          error={errors.fieldErrors.defaultContactPhone}
          value={form.defaultContactPhone}
          onChange={(event) => updateField("defaultContactPhone", event.target.value)}
        />
        <LabeledInput
          id="edit-timezone"
          label="Timezone"
          error={errors.fieldErrors.timezone}
          value={form.timezone}
          onChange={(event) => updateField("timezone", event.target.value)}
          required
        />
        <FieldError label="Address" id="edit-address" error={errors.fieldErrors.address} className="md:col-span-2">
          <Textarea
            id="edit-address"
            value={form.address}
            onChange={(event) => updateField("address", event.target.value)}
            rows={3}
          />
        </FieldError>
      </div>

      {errors.formError && <p className="mt-4 text-sm text-destructive">{errors.formError}</p>}
      {saved && <p className="mt-4 text-sm text-emerald">Temple details updated.</p>}

      <div className="mt-4 flex justify-end">
        <Button type="submit" disabled={submitting}>
          <Save className="size-4" />
          {submitting ? "Saving..." : "Save"}
        </Button>
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
