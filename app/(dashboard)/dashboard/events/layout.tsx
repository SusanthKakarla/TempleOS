import { SetPageTheme } from "@/components/theme/theme-provider";

export default function EventsThemeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SetPageTheme themeKey="events" />
      {children}
    </>
  );
}
