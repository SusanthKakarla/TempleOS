import { getSessionAdmin } from "@/lib/auth/session";
import { DevoteeImportWizard } from "@/features/devotees/devotee-import-wizard";

export default async function DevoteeImportPage() {
  const session = await getSessionAdmin();
  if (!session) return null; // guarded by the dashboard layout

  return <DevoteeImportWizard />;
}
