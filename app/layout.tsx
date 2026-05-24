import type { Metadata } from "next";
import "./globals.scss";
import PageTransition from "../components/PageTransition";
import { CmsSiteFooter } from "../components/cms/CmsSiteChrome";
import { getCmsFooterById, getCmsGlobalSettings } from "../lib/cms/contentful";

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
    <html lang="en">
      <body>
        <PageTransition>{children}</PageTransition>
        {footer ? (
          <CmsSiteFooter footer={footer} />
        ) : (
          <footer className="container py-4 border-top">
            <p className="text-center text-secondary mb-0">
              © {new Date().getFullYear()} Edu Placement. All rights reserved.
            </p>
          </footer>
        )}
      </body>
    </html>
  );
}
