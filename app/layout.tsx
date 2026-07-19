import type { Metadata, Viewport } from "next";
import { Sora } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { SiteNavbar } from "@/components/site/navbar";
import { SiteFooter } from "@/components/site/footer";
import { FloatingWhatsApp } from "@/components/site/floating-whatsapp";
import { StoreHydrator } from "@/components/providers/store-hydrator";
import { SITE_CONFIG } from "@/lib/config";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${SITE_CONFIG.dealerName} — Premium Cars in Ghana`,
    template: `%s · ${SITE_CONFIG.dealerName}`,
  },
  description: SITE_CONFIG.tagline,
  keywords: [
    "cars for sale Ghana",
    "premium cars Accra",
    "used cars Ghana",
    "car dealership",
    SITE_CONFIG.dealerName,
  ],
  metadataBase: new URL("https://eclipsemotors.org"),
  openGraph: {
    title: `${SITE_CONFIG.dealerName} — Premium Cars in Ghana`,
    description: SITE_CONFIG.tagline,
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0B0B0C" },
    { media: "(prefers-color-scheme: light)", color: "#F7F6F3" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sora.variable} font-sans`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <StoreHydrator />
          <div className="relative flex min-h-screen flex-col">
            <SiteNavbar />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
          <FloatingWhatsApp />
          <Toaster position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
