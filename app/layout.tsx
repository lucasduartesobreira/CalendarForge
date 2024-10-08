import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CalendarForge",
  description: "The Calendar to Forge your week",
  authors: [
    { name: "Lucas D Sobreira", url: "https://github.com/lucasduartesobreira" },
  ],
  openGraph: {
    title: "Calendar Forge",
    description: "The Calendar to Forge your week",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <link rel="icon" href="/favicon.ico" sizes="any" />
      <body className={inter.className}>{children}</body>
    </html>
  );
}
