import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { BuildVersion } from "@/components/BuildVersion";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Birds Eye Man-Tech Portal",
  description: "Private Man-Tech project write-ups and live matrix.",
  icons: { icon: "/favicon.svg" },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sans.variable} font-sans antialiased`}>
        {children}
        <BuildVersion />
      </body>
    </html>
  );
}
