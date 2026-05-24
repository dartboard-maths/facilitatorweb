"use client";

import { usePathname } from "next/navigation";
import type { CmsFooter } from "../../lib/cms/contentful";
import { CmsSiteFooter } from "./CmsSiteChrome";

type CmsFooterGateProps = {
  footer?: CmsFooter | null;
};

export default function CmsFooterGate({ footer }: CmsFooterGateProps) {
  const pathname = usePathname();

  if (pathname === "/tutors") {
    return null;
  }

  if (footer) {
    return <CmsSiteFooter footer={footer} />;
  }

  return (
    <footer className="container py-4 border-top">
      <p className="text-center text-secondary mb-0">
        © {new Date().getFullYear()} Edu Placement. All rights reserved.
      </p>
    </footer>
  );
}
