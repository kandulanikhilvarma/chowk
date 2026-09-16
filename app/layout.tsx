import type { Metadata, Viewport } from "next";
import { Anek_Latin, Inter } from "next/font/google";
import { BottomNav } from "@/components/shell/bottom-nav";
import { Footer } from "@/components/shell/footer";
import { Header } from "@/components/shell/header";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const anek = Anek_Latin({ subsets: ["latin"], variable: "--font-anek", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://chowk-kandula.vercel.app"),
  title: { default: "Chowk: buy and sell near you", template: "%s | Chowk" },
  description:
    "Free marketplace for India. Sell what you do not use. Find what you need from people near you. No fees, no commission.",
  applicationName: "Chowk",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf8f3" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1020" },
  ],
};

// Runs before first paint so a saved theme never flashes the wrong colors.
const themeScript = `try{var t=localStorage.getItem("theme");if(t)document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" suppressHydrationWarning className={`${inter.variable} ${anek.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {/* Photos load from these hosts; opening the connection early cuts the largest paint. */}
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
      </head>
      <body className="min-h-dvh">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-on-primary"
        >
          Skip to content
        </a>
        <Header />
        <main id="main" className="pb-8">
          {children}
        </main>
        <Footer />
        <BottomNav />
      </body>
    </html>
  );
}
