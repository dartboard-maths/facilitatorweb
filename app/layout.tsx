import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import PageTransition from "../components/PageTransition";
import CmsFooterGate from "../components/cms/CmsFooterGate";
import { getCmsFooterById, getCmsGlobalSettings } from "../lib/cms/contentful";
import "./globals.scss";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Edu Placement",
  description: "Edu Placement tutor marketplace.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const fallbackFooterId = process.env.CONTENTFUL_FOOTER_ENTRY_ID || "42X6dGDHngoLCH17NAwE6P";
  const globalSettings = await getCmsGlobalSettings();
  const footer = globalSettings?.footer || (await getCmsFooterById(fallbackFooterId));

  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <body>
        <PageTransition>{children}</PageTransition>
        <CmsFooterGate footer={footer} />
      </body>
    </html>
  );
}
