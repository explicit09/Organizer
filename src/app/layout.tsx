import type { Metadata } from "next";
import { Newsreader, Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space",
  subsets: ["latin"],
  display: "swap",
});

const newsreader = Newsreader({
  variable: "--font-news",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Organizer",
  description: "AI-first life organizer for tasks, meetings, and school work.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${spaceGrotesk.variable} ${newsreader.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
