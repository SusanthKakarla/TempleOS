import { redirect } from "next/navigation";
import { SuperAdminLoginForm } from "@/features/super-admin/super-admin-login-form";
import { requireSuperAdmin } from "@/lib/auth/super-admin-session";

interface SuperAdminLoginPageProps {
  searchParams?: Promise<{ next?: string | string[] }>;
}

export default async function SuperAdminLoginPage({ searchParams }: SuperAdminLoginPageProps) {
  const params = await searchParams;
  const redirectPath = getSafeSuperAdminNextPath(
    Array.isArray(params?.next) ? params.next[0] : params?.next,
  );
  const superAdmin = await requireSuperAdmin();

  if (superAdmin) {
    redirect(redirectPath);
  }

  return <SuperAdminLoginForm redirectPath={redirectPath} />;
}

function getSafeSuperAdminNextPath(value: string | undefined): string {
  if (!value) return "/super-admin";
  if (!value.startsWith("/super-admin")) return "/super-admin";
  if (value.startsWith("//") || value.includes("://")) return "/super-admin";
  if (value === "/super-admin/login" || value.startsWith("/super-admin/login?")) {
    return "/super-admin";
  }
  return value;
}
