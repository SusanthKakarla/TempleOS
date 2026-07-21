import { notFound } from "next/navigation";
import { requireDashboardAdmin } from "../../../../require-dashboard-admin";
import { getFamilyWithMembers } from "@/lib/db/devotee-families";
import { FamilyFormWizard } from "@/features/devotees/family-form-wizard";

interface EditFamilyPageProps {
  params: Promise<{ familyId: string }>;
}

export default async function EditFamilyPage({ params }: EditFamilyPageProps) {
  const session = await requireDashboardAdmin();
  const { familyId } = await params;

  const result = await getFamilyWithMembers(session.tenantId, familyId);
  if (!result) notFound();

  return <FamilyFormWizard mode="edit" family={result.family} members={result.members} />;
}
