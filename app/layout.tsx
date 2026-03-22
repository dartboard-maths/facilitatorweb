import type { Metadata } from "next";
import "./globals.scss";
import PageTransition from "../components/PageTransition";

export const metadata: Metadata = {
  title: "Edu Placement",
  description: "Edu Placement tutor marketplace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <PageTransition>{children}</PageTransition>
      </body>
    </html>
  );
}
