import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_Telugu, Playfair_Display } from "next/font/google";
import Script from "next/script";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const notoSansTelugu = Noto_Sans_Telugu({
  variable: "--font-noto-telugu",
  subsets: ["telugu"],
});

export const metadata: Metadata = {
  title: "TempleOS Admin",
  description: "Temple event and devotee management dashboard",
};

// Sets the light/dark class on <html> before hydration, so there's no flash
// of the wrong theme on load.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("theme") || "system";
    var resolved = stored === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : stored;
    var root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolved);
    root.style.colorScheme = resolved;
  } catch (e) {}
})();
`;

// Dev-only: Next.js 16 + Turbopack + React 19 emit "Encountered a script tag
// while rendering React component" for the theme-init script above even
// though it's a documented, correct use of next/script's `beforeInteractive`
// strategy — a known false positive (see https://github.com/shadcn-ui/ui/issues/10104),
// confirmed absent from production builds. There's currently no API-level
// way to avoid it, so — matching the community's own workaround — this
// filters out only that exact message; every other console.error still
// passes through untouched. Never runs in production.
const CONSOLE_FILTER_SCRIPT = `
(function () {
  var original = console.error;
  console.error = function () {
    if (typeof arguments[0] === "string" && arguments[0].indexOf("Encountered a script tag while rendering React component") !== -1) {
      return;
    }
    return original.apply(console, arguments);
  };
})();
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} ${playfairDisplay.variable} ${notoSansTelugu.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        {process.env.NODE_ENV !== "production" && (
          <Script id="console-filter-dev-only" strategy="beforeInteractive">
            {CONSOLE_FILTER_SCRIPT}
          </Script>
        )}
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <TooltipProvider delay={200}>
            {children}
            <Toaster />
          </TooltipProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
