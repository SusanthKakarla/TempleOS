import { ForbiddenSignOutButton } from "./forbidden-sign-out-button";

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/20 p-6">
      <section className="max-w-md rounded-lg border bg-background p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-foreground">Dashboard access required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your temple membership is active, but this dashboard requires the admin role.
        </p>
        <ForbiddenSignOutButton />
      </section>
    </main>
  );
}
