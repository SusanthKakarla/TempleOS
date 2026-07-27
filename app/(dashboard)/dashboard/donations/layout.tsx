import { SetPageTheme } from "@/components/theme/theme-provider";

export default function DonationsThemeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SetPageTheme themeKey="donations" />
      {children}
    </>
  );
}
