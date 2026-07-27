import { SetPageTheme } from "@/components/theme/theme-provider";

export default function ChatbotSettingsThemeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SetPageTheme themeKey="whatsapp" />
      {children}
    </>
  );
}
