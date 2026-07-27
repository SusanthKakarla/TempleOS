import { ThemeBackdrop } from "@/components/theme/theme-backdrop";
import { TenantLoginForm } from "@/features/auth/tenant-login-form";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center p-4">
      <ThemeBackdrop themeKey="login" />
      <TenantLoginForm />
    </main>
  );
}
