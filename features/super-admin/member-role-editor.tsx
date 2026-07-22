"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { SuperAdminTenantMember } from "@/lib/db/tenants";
import type { RoleCode, RoleDefinition } from "@/types/db";
import {
  buildAssignMemberRolesPayload,
  formErrorsFromMemberRoleApiError,
  type MemberRoleEditorErrors,
} from "./member-role-editor-helpers";

const emptyErrors: MemberRoleEditorErrors = { fieldErrors: {} };

interface MemberRoleEditorProps {
  tenantId: string;
  member: SuperAdminTenantMember;
  roles: RoleDefinition[];
}

export function MemberRoleEditor({ tenantId, member, roles }: MemberRoleEditorProps) {
  const router = useRouter();
  const roleKey = member.roles.join("\u0000");
  const [{ formKey, selectedRoles: storedRoles }, setRoleState] = useState(() => ({
    formKey: roleKey,
    selectedRoles: member.roles,
  }));
  const selectedRoles = formKey === roleKey ? storedRoles : member.roles;
  const [errors, setErrors] = useState<MemberRoleEditorErrors>(emptyErrors);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [saved, setSaved] = useState(false);

  if (formKey !== roleKey) {
    setRoleState({ formKey: roleKey, selectedRoles });
  }

  function toggleRole(role: RoleCode, checked: boolean) {
    setRoleState((current) => {
      const nextRoles = checked
        ? Array.from(new Set([...current.selectedRoles, role]))
        : current.selectedRoles.filter((item) => item !== role);
      return { ...current, selectedRoles: nextRoles };
    });
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
      const response = await fetch(
        `/api/super-admin/temples/${tenantId}/members/${member.id}/roles`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildAssignMemberRolesPayload({ selectedRoles })),
        },
      );
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setErrors(formErrorsFromMemberRoleApiError(body));
        return;
      }

      setSaved(true);
      router.refresh();
    } catch {
      setErrors({ fieldErrors: {}, formError: "Role assignment failed." });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="min-w-64 space-y-3">
      <div className="flex flex-wrap gap-2">
        {roles.map((role) => {
          const checked = selectedRoles.includes(role.code);
          return (
            <label
              key={role.code}
              className="inline-flex h-8 items-center gap-2 rounded-md border px-2 text-sm"
            >
              <Checkbox
                checked={checked}
                onCheckedChange={(value) => toggleRole(role.code, value === true)}
                aria-label={`${role.displayName} role for ${member.displayName}`}
              />
              <span>{role.displayName}</span>
            </label>
          );
        })}
      </div>
      {errors.fieldErrors.roles && <p className="text-sm text-destructive">{errors.fieldErrors.roles}</p>}
      {errors.formError && <p className="text-sm text-destructive">{errors.formError}</p>}
      {saved && (
        <p className="text-sm text-emerald-700">
          Roles saved for {member.displayName}.
        </p>
      )}
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={submitting}>
          <Save className="size-3.5" />
          {submitting ? "Saving..." : "Save roles"}
        </Button>
        <Badge variant="outline">{tenantId}</Badge>
      </div>
    </form>
  );
}
