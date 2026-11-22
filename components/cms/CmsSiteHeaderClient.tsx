"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { CmsHeader, CmsLink, CmsMenuItem, CmsRenderContext } from "../../lib/cms/contentful";
import styles from "./CmsSiteChrome.module.scss";

function isExternalLink(url: string, explicitExternal: boolean): boolean {
  if (explicitExternal) {
    return true;
  }

  return /^https?:\/\//i.test(url) || url.startsWith("mailto:") || url.startsWith("tel:");
}

function CmsLinkItem({
  link,
  className,
  renderContext,
}: {
  link: CmsLink;
  className: string;
  renderContext?: CmsRenderContext;
}) {
  if (link.hideLabel) {
    return null;
  }

  const contextual = renderContext?.contextualLinks?.[link.url];
  const href = contextual?.href || (link.url === "#sign-in" ? "/sign-in" : link.url);
  const label = contextual?.label || (link.url === "#sign-in" ? "Sign in" : link.label);
  const externalLink = link.externalLink;

  if (isExternalLink(href, externalLink)) {
    return (
      <a className={className} href={href} target="_blank" rel="noreferrer">
        {label}
      </a>
    );
  }

  return (
    <Link className={className} href={href}>
      {label}
    </Link>
  );
}

function HeaderMenuItem({ item, renderContext }: { item: CmsMenuItem; renderContext?: CmsRenderContext }) {
  if (item.kind === "link") {
    return <CmsLinkItem link={item} className={styles.siteHeader__link} renderContext={renderContext} />;
  }

  if (!item.links.length) {
    return null;
  }

  return (
    <div className={`dropdown ${styles.siteHeader__dropdown}`}>
      <button
        className={`dropdown-toggle ${styles.siteHeader__dropdownToggle}`}
        type="button"
        data-bs-toggle="dropdown"
        aria-expanded="false"
      >
        {item.title}
      </button>
      <ul className={`dropdown-menu ${styles.siteHeader__dropdownMenu}`}>
        {item.links.map((subLink) => (
          <li key={subLink.id}>
            <CmsLinkItem
              link={subLink}
              className={`dropdown-item ${styles.siteHeader__dropdownItem}`}
              renderContext={renderContext}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

type CmsSiteHeaderClientProps = {
  header?: CmsHeader;
  renderContext?: CmsRenderContext;
};

export default function CmsSiteHeaderClient({ header, renderContext }: CmsSiteHeaderClientProps) {
  const headerRef = useRef<HTMLElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const node = headerRef.current;
    if (!node) {
      return;
    }

    const publishOffset = () => {
      document.documentElement.style.setProperty("--dbm-header-offset", `${node.offsetHeight}px`);
    };

    publishOffset();
    const observer = new ResizeObserver(publishOffset);
    observer.observe(node);

    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--dbm-header-offset");
    };
  }, [header]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      setScrolled(currentScrollY > 20);

      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setHeaderVisible(false);
      } else if (currentScrollY < lastScrollY) {
        setHeaderVisible(true);
      }

      if (currentScrollY <= 10) {
        setHeaderVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  if (!header) {
    return null;
  }

  const headerClassName = [
    styles.siteHeader,
    scrolled ? styles["siteHeader--scrolled"] : "",
    !headerVisible ? styles["siteHeader--hidden"] : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <header ref={headerRef} className={headerClassName}>
      <div className={styles.siteHeader__bar}>
      <div className={styles.siteHeader__container}>
        <Link href="/" className={styles.siteHeader__logoLink}>
          {header.logo?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={header.logo.url}
              alt={header.logo.title || header.title || "Site logo"}
              className={styles.siteHeader__logoImage}
            />
          ) : (
            header.title || "Edu Placement"
          )}
        </Link>
        <nav className={styles.siteHeader__nav} aria-label="Primary navigation">
          {header.menu?.links.map((item) => (
            <HeaderMenuItem key={item.id} item={item} renderContext={renderContext} />
          ))}
        </nav>
      </div>
      </div>
    </header>
  );
}
