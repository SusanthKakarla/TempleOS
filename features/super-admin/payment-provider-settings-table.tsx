"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";
import type { PaymentProvider, PaymentProviderKey } from "@/types/db";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableShell } from "@/components/table-shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface PaymentProviderSettingsTableProps {
  providers: PaymentProvider[];
}

type Field = "status" | "manualEnabled" | "partnerEnabled" | "defaultConnectionMethod";

/** Platform-wide toggles — every change affects every tenant on this provider simultaneously (mirrors payment_providers.status, which already gated Razorpay/PhonePe availability before this page existed, just previously only settable via raw SQL). */
export function PaymentProviderSettingsTable({ providers }: PaymentProviderSettingsTableProps) {
  const router = useRouter();
  const [pendingKey, setPendingKey] = useState<PaymentProviderKey | null>(null);

  async function updateField(key: PaymentProviderKey, field: Field, value: string | boolean) {
    setPendingKey(key);
    try {
      const response = await fetch(`/api/super-admin/payment-providers/${key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Could not update payment provider settings.");
      }
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update payment provider settings.");
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <TableShell>
      <div className="border-b px-4 py-3">
        <h2 className="text-base font-semibold tracking-normal">Payment providers</h2>
        <p className="text-sm text-muted-foreground">
          Platform-wide availability — changes apply to every temple immediately.
        </p>
      </div>
      <div className="hidden md:block">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[16%]">Provider</TableHead>
              <TableHead className="w-[14%]">Status</TableHead>
              <TableHead className="w-[18%]">Manual configuration</TableHead>
              <TableHead className="w-[26%]">Partner onboarding</TableHead>
              <TableHead className="w-[26%]">Default mode</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {providers.map((provider) => (
              <ProviderRow
                key={provider.key}
                provider={provider}
                pending={pendingKey === provider.key}
                onUpdate={updateField}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="divide-y md:hidden">
        {providers.map((provider) => (
          <div key={provider.key} className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">{provider.label}</span>
              <Badge variant={provider.status === "active" ? "default" : "secondary"}>
                {provider.status === "active" ? "Active" : "Coming soon"}
              </Badge>
            </div>
            <ToggleRow
              label="Manual configuration"
              checked={provider.manualEnabled}
              disabled={pendingKey === provider.key}
              onCheckedChange={(checked) => updateField(provider.key, "manualEnabled", checked)}
            />
            <ToggleRow
              label="Partner onboarding"
              checked={provider.partnerEnabled}
              disabled={pendingKey === provider.key}
              onCheckedChange={(checked) => updateField(provider.key, "partnerEnabled", checked)}
            />
          </div>
        ))}
      </div>
    </TableShell>
  );
}

function ProviderRow({
  provider,
  pending,
  onUpdate,
}: {
  provider: PaymentProvider;
  pending: boolean;
  onUpdate: (key: PaymentProviderKey, field: Field, value: string | boolean) => void;
}) {
  return (
    <TableRow>
      <TableCell className="align-middle font-medium">{provider.label}</TableCell>
      <TableCell className="align-middle">
        <Badge variant={provider.status === "active" ? "default" : "secondary"}>
          {provider.status === "active" ? "Active" : "Coming soon"}
        </Badge>
      </TableCell>
      <TableCell className="align-middle">
        <Switch
          checked={provider.manualEnabled}
          disabled={pending}
          onCheckedChange={(checked) => onUpdate(provider.key, "manualEnabled", checked)}
        />
      </TableCell>
      <TableCell className="align-middle">
        <div className="flex items-center gap-2">
          <Switch
            checked={provider.partnerEnabled}
            disabled={pending}
            onCheckedChange={(checked) => onUpdate(provider.key, "partnerEnabled", checked)}
          />
          {!provider.partnerEnabled && <span className="text-xs text-muted-foreground">Requires platform credentials</span>}
        </div>
      </TableCell>
      <TableCell className="align-middle">
        <Select
          value={provider.defaultConnectionMethod}
          onValueChange={(value) => {
            if (value) onUpdate(provider.key, "defaultConnectionMethod", value);
          }}
        >
          <SelectTrigger size="sm" className="w-40" disabled={pending}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="partner">Partner</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
    </TableRow>
  );
}

function ToggleRow({
  label,
  checked,
  disabled,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export function PlatformCredentialStatus({ label, configured }: { label: string; configured: boolean }) {
  return (
    <div className="flex items-center gap-1.5 text-sm">
      {configured ? (
        <CheckCircle2 className="size-4 text-emerald" />
      ) : (
        <XCircle className="size-4 text-muted-foreground" />
      )}
      <span className={configured ? "" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}
