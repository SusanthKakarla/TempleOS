import { SetPageTheme } from "@/components/theme/theme-provider";

export default function CampaignsThemeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SetPageTheme themeKey="campaigns" />
      {children}
    </>
  );
}
