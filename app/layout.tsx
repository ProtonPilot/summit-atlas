import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Summit Atlas",
  description:
    "Explore ski resorts around the world with snow context and mountain detail pages.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
