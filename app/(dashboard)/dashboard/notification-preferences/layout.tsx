import { SetPageTheme } from "@/components/theme/theme-provider";

export default function NotificationPreferencesThemeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SetPageTheme themeKey="settings" />
      {children}
    </>
  );
}
