import { SetPageTheme } from "@/components/theme/theme-provider";

export default function DevoteesThemeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SetPageTheme themeKey="devotees" />
      {children}
    </>
  );
}
