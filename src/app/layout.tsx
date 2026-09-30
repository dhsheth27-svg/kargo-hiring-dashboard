import type { Metadata } from "next";
import { Hanken_Grotesk } from "next/font/google";
import Chrome from "@/components/Chrome";
import "./globals.css";

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Kargo Hiring",
  description: "Internal hiring dashboard for Kargo",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${hanken.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Chrome>{children}</Chrome>
      </body>
    </html>
  );
}
