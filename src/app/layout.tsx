import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ListingAI — Interactive listing workspace",
  description:
    "Turn a residential property listing into an interactive AI workspace: editable data, room-grouped photos, a grounded property assistant, mortgage modeling, maps, and a spatial preview.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="app-ambient min-h-full">
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
