import { SetPageTheme } from "@/components/theme/theme-provider";

/** Not one of the EL10 spec's named 25 features — reuses the general Dashboard identity rather than inventing an unassigned theme. */
export default function AdminsThemeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SetPageTheme themeKey="dashboard" />
      {children}
    </>
  );
}
