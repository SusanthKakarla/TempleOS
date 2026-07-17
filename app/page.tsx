import { redirect } from "next/navigation";
import { getSessionAdmin } from "@/lib/auth/session";

export default async function RootPage() {
  const session = await getSessionAdmin();
  redirect(session ? "/dashboard" : "/login");
}
