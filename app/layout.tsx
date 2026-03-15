import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { getPublicSiteUrl } from "@/lib/site-url";
import "./globals.css";

const defaultUrl = getPublicSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Blood Bridge",
  description:
    "Real-time donor coordination platform built with Next.js, Supabase, and Vercel.",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
