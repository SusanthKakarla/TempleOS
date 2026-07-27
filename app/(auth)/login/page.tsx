import { AmbientBackground } from "@/features/dashboard/ambient-background";
import { TenantLoginForm } from "@/features/auth/tenant-login-form";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center p-4">
      <AmbientBackground />
      <TenantLoginForm />
    </main>
  );
}
