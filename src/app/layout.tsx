import type { Metadata } from "next";
import { Figtree, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Providers } from "./providers";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-sans" });

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const nasalization = localFont({
  src: "../../public/fonts/Nasalization Rg.otf",
  variable: "--font-nasalization",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Deskops AI — Your AI Back Office, On Autopilot",
  description:
    "A multi-agent AI back office for small businesses. Specialist agents handle customers, invoicing, inventory and books over WhatsApp — every real-world action gated by human approval.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full antialiased font-sans",
        figtree.variable,
        geistMono.variable,
        nasalization.variable
      )}
    >
      <body className="min-h-full flex flex-col"><Providers>{children}</Providers></body>
    </html>
  );
}
