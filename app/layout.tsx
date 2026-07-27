import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter, Noto_Sans_Telugu } from "next/font/google";
import Script from "next/script";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { InstallProvider } from "@/components/pwa/install-provider";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSansTelugu = Noto_Sans_Telugu({
  variable: "--font-noto-telugu",
  subsets: ["telugu"],
});

const SITE_DESCRIPTION = "Temple event and devotee management dashboard";

export const metadata: Metadata = {
  title: {
    default: "TempleOS Admin",
    template: "%s · TempleOS",
  },
  description: SITE_DESCRIPTION,
  icons: {
    // favicon.ico itself is auto-detected by Next.js from public/favicon.ico —
    // listing it again here would just duplicate that <link> tag.
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    other: [{ rel: "mask-icon", url: "/favicon.svg", color: "#5a6b3a" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TempleOS",
  },
  openGraph: {
    title: "TempleOS Admin",
    description: SITE_DESCRIPTION,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "TempleOS" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TempleOS Admin",
    description: SITE_DESCRIPTION,
    images: ["/og-image.png"],
  },
  other: {
    "msapplication-config": "/browserconfig.xml",
    "msapplication-TileColor": "#f8fafc",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#090d16" },
  ],
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
      className={`${inter.variable} ${geistMono.variable} ${notoSansTelugu.variable} h-full antialiased`}
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
            <InstallProvider>
              {children}
              <Toaster />
            </InstallProvider>
            <ServiceWorkerRegister />
          </TooltipProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
