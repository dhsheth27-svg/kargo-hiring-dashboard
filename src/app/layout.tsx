import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kargo Hiring",
  description: "Internal hiring dashboard for Kargo",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-neutral-950 text-neutral-100">
        <nav className="border-b border-neutral-800 px-6 py-3 flex items-center gap-6 text-sm">
          <span className="font-semibold text-neutral-300">Kargo Hiring</span>
          <a href="/upload" className="text-neutral-400 hover:text-neutral-100">
            Upload
          </a>
          <a href="/dashboard" className="text-neutral-400 hover:text-neutral-100">
            Dashboard
          </a>
        </nav>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
