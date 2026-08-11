"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Phone, User, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { LabeledInput } from "@/components/ui/labeled-input";
import type { RoleCode, RoleDefinition } from "@/types/db";
import {
  ADD_TEMPLE_MEMBER_FALLBACK_ERROR,
  buildAddTempleMemberPayload,
  formErrorsFromAddTempleMemberApiError,
  type AddTempleMemberErrors,
  type AddTempleMemberFormState,
} from "./add-temple-member-dialog-helpers";

const emptyErrors: AddTempleMemberErrors = { fieldErrors: {} };
const DEFAULT_ROLE: RoleCode = "admin";

function emptyForm(): AddTempleMemberFormState {
  return { displayName: "", phoneNumber: "", selectedRoles: [DEFAULT_ROLE] };
}

interface AddTempleMemberDialogProps {
  tenantId: string;
  /** Active role definitions from the database — never a hardcoded role list. */
  roles: RoleDefinition[];
}

/**
 * Super Admin's manual "add a temple admin" entry point on the temple detail
 * page. Posts to the super-admin members endpoint and refreshes the server
 * component, so the Members table and its active count update in place.
 */
export function AddTempleMemberDialog({ tenantId, roles }: AddTempleMemberDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<AddTempleMemberFormState>(emptyForm);
  const [errors, setErrors] = useState<AddTempleMemberErrors>(emptyErrors);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  function updateField(field: "displayName" | "phoneNumber", value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors(emptyErrors);
  }

  function toggleRole(role: RoleCode, checked: boolean) {
    setForm((current) => ({
      ...current,
      selectedRoles: checked
        ? Array.from(new Set([...current.selectedRoles, role]))
        : current.selectedRoles.filter((item) => item !== role),
    }));
    setErrors(emptyErrors);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;

    if (form.selectedRoles.length === 0) {
      setErrors({ fieldErrors: { roles: "Select at least one role." } });
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setErrors(emptyErrors);

    try {
      const response = await fetch(`/api/super-admin/temples/${tenantId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildAddTempleMemberPayload(form)),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setErrors(formErrorsFromAddTempleMemberApiError(body));
        return;
      }

      const addedName = form.displayName.trim();
      setOpen(false);
      setForm(emptyForm());
      toast.success(`${addedName} added to this temple.`);
      router.refresh();
    } catch {
      setErrors({ fieldErrors: {}, formError: ADD_TEMPLE_MEMBER_FALLBACK_ERROR });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setForm(emptyForm());
          setErrors(emptyErrors);
        }
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="shrink-0 gap-1.5">
            <UserPlus className="size-3.5" />
            Add Member
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Member</DialogTitle>
          <DialogDescription>
            Adds a member to this temple by phone number. An existing person keeps their account —
            only the temple membership and roles are added.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <LabeledInput
            id="add-temple-member-name"
            label="Name"
            icon={<User />}
            value={form.displayName}
            onChange={(event) => updateField("displayName", event.target.value)}
            error={errors.fieldErrors.displayName}
            required
          />
          <LabeledInput
            id="add-temple-member-phone"
            label="Phone number"
            icon={<Phone />}
            type="tel"
            value={form.phoneNumber}
            onChange={(event) => updateField("phoneNumber", event.target.value)}
            error={errors.fieldErrors.phoneNumber}
            required
          />
          <div className="space-y-2">
            <Label>Roles</Label>
            <div className="flex flex-wrap gap-2">
              {roles.map((role) => (
                <label
                  key={role.code}
                  className="inline-flex h-8 items-center gap-2 rounded-md border px-2 text-sm"
                >
                  <Checkbox
                    checked={form.selectedRoles.includes(role.code)}
                    onCheckedChange={(value) => toggleRole(role.code, value === true)}
                    aria-label={`${role.displayName} role`}
                  />
                  <span>{role.displayName}</span>
                </label>
              ))}
            </div>
            {errors.fieldErrors.roles && (
              <p className="text-sm text-destructive">{errors.fieldErrors.roles}</p>
            )}
          </div>
          {errors.formError && <p className="text-sm text-destructive">{errors.formError}</p>}
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Adding..." : "Add Member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
