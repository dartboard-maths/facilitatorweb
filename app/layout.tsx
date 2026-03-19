import type { Metadata } from "next";
import "./globals.scss";

export const metadata: Metadata = {
  title: "Tutor Marketplace",
  description: "Create tutor profiles with geolocation.",
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
