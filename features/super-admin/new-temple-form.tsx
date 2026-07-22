"use client";

import { useMemo, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BellRing,
  CalendarCheck,
  CalendarDays,
  CalendarHeart,
  CheckCircle2,
  Contact,
  Download,
  FileBarChart,
  Globe2,
  HandCoins,
  HeartHandshake,
  Landmark,
  Languages,
  LayoutDashboard,
  LayoutGrid,
  LineChart,
  MessageCircle,
  Package,
  Phone,
  QrCode,
  Settings2,
  ShieldCheck,
  Soup,
  Sparkles,
  Upload,
  UserCog,
  UserRound,
  Users,
  Users2,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { Feature, FeatureKey, RoleCode } from "@/types/db";

const emptyErrors: NewTempleFormErrors = { fieldErrors: {}, sectionErrors: {} };

const STEPS = [
  { key: "temple", title: "Temple", icon: Landmark },
  { key: "domain", title: "Domain", icon: Globe2 },
  { key: "firstMember", title: "First Member", icon: UserRound },
  { key: "whatsapp", title: "WhatsApp", icon: ShieldCheck },
  { key: "features", title: "Feature Access", icon: LayoutGrid },
] as const;

const FEATURE_ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  CalendarDays,
  Users,
  HandCoins,
  MessageCircle,
  BellRing,
  Settings2,
  UserCog,
  ShieldCheck,
  UsersRound,
  Download,
  Upload,
  FileBarChart,
  LineChart,
  Package,
  Soup,
  HeartHandshake,
  Users2,
  UserRound,
  Globe2,
  QrCode,
  CalendarCheck,
  Sparkles,
  Languages,
  CalendarHeart,
  Contact,
};

function featureIcon(iconName: string | null): LucideIcon {
  return (iconName && FEATURE_ICON_MAP[iconName]) || LayoutGrid;
}

export function NewTempleForm({ features }: { features: Feature[] }) {
  const defaultFeatureKeys = useMemo(
    () => features.filter((f) => f.category !== "coming_soon" && f.defaultEnabled).map((f) => f.key),
    [features],
  );
  const [form, setForm] = useState<NewTempleFormState>({
    ...DEFAULT_NEW_TEMPLE_FORM_STATE,
    featureKeys: defaultFeatureKeys,
  });
  const [errors, setErrors] = useState<NewTempleFormErrors>(emptyErrors);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<ProvisionTempleSuccess["temple"] | null>(null);
  const [step, setStep] = useState(0);
  const hostname = useMemo(() => fullHostnamePreview(form.subdomain), [form.subdomain]);

  function toggleFeature(feature: Feature) {
    if (feature.isCore || feature.category === "coming_soon") return;
    setForm((current) => ({
      ...current,
      featureKeys: current.featureKeys.includes(feature.key)
        ? current.featureKeys.filter((key) => key !== feature.key)
        : [...current.featureKeys, feature.key],
    }));
  }

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
                        <Checkbox
                          checked={form.firstMemberRoles.includes(role.code)}
                          disabled={role.code === "admin"}
                          onCheckedChange={() => toggleRole(role.code)}
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

          {step === 4 && (
            <Card className="glass-card rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <LayoutGrid className="size-4 text-primary" />
                  Feature Access
                </CardTitle>
                <CardDescription>Choose which modules this temple gets. Core features are always on.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FeatureGroup
                  title="Core"
                  features={features.filter((f) => f.category === "core")}
                  selected={form.featureKeys}
                  onToggle={toggleFeature}
                />
                <FeatureGroup
                  title="Modules"
                  features={features.filter((f) => f.category === "module")}
                  selected={form.featureKeys}
                  onToggle={toggleFeature}
                />
                <FeatureGroup
                  title="Coming soon"
                  features={features.filter((f) => f.category === "coming_soon")}
                  selected={form.featureKeys}
                  onToggle={toggleFeature}
                  comingSoon
                />
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

function FeatureGroup({
  title,
  features,
  selected,
  onToggle,
  comingSoon = false,
}: {
  title: string;
  features: Feature[];
  selected: FeatureKey[];
  onToggle: (feature: Feature) => void;
  comingSoon?: boolean;
}) {
  if (features.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => {
          const Icon = featureIcon(feature.icon);
          const checked = feature.isCore || selected.includes(feature.key);
          return (
            <label
              key={feature.key}
              className={cn(
                "flex items-start gap-2 rounded-lg border px-3 py-2 text-sm",
                comingSoon ? "cursor-not-allowed opacity-50" : "cursor-pointer",
              )}
              title={feature.description ?? undefined}
            >
              <Checkbox
                checked={checked}
                disabled={feature.isCore || comingSoon}
                onCheckedChange={() => onToggle(feature)}
                className="mt-0.5"
              />
              <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span className="flex flex-col">
                <span>{feature.displayName}</span>
                {feature.isCore && <span className="text-xs text-muted-foreground">Always on</span>}
                {comingSoon && <span className="text-xs text-muted-foreground">Coming soon</span>}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
