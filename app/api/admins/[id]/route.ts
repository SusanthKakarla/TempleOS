import { NextResponse } from "next/server";

export async function PATCH() {
  return retiredAdminManagementResponse();
}

export async function DELETE() {
  return retiredAdminManagementResponse();
}

function retiredAdminManagementResponse(): NextResponse {
  return NextResponse.json(
    {
      error: "Tenant admin management has moved to tenant memberships.",
      code: "TENANT_ADMIN_MANAGEMENT_RETIRED",
    },
    { status: 410 },
  );
}
