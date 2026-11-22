"use client";

import Link from "next/link";
import type { CmsFooter, CmsHeader, CmsLink, CmsRenderContext } from "../../lib/cms/contentful";
import { toParagraphs } from "../../lib/cms/contentful";
import CmsSiteHeaderClient from "./CmsSiteHeaderClient";
import styles from "./CmsSiteChrome.module.scss";

type CmsSiteFooterProps = {
  footer?: CmsFooter;
};

function isExternalLink(url: string, explicitExternal: boolean): boolean {
  if (explicitExternal) {
    return true;
  }

  return /^https?:\/\//i.test(url) || url.startsWith("mailto:") || url.startsWith("tel:");
}

function CmsLinkItem({ link, className }: { link: CmsLink; className: string }) {
  if (link.hideLabel) {
    return null;
  }

  if (isExternalLink(link.url, link.externalLink)) {
    return (
      <a className={className} href={link.url} target="_blank" rel="noreferrer">
        {link.label}
      </a>
    );
  }

  return (
    <Link className={className} href={link.url}>
      {link.label}
    </Link>
  );
}

export function CmsSiteHeader({ header, renderContext }: { header?: CmsHeader; renderContext?: CmsRenderContext }) {
  return <CmsSiteHeaderClient header={header} renderContext={renderContext} />;
}

function FooterMenuItem({ link }: { link: CmsLink }) {
  return <CmsLinkItem link={link} className={styles.siteFooter__link} />;
}

export function CmsSiteFooter({ footer }: CmsSiteFooterProps) {
  if (!footer) {
    return null;
  }

  return (
    <footer className={styles.siteFooter}>
      <div className={`container ${styles.siteFooter__inner}`}>
        {footer.title ? <h2 className={styles.siteFooter__title}>{footer.title}</h2> : null}
        {toParagraphs(footer.copy).map((paragraph, index) => (
          <p className={styles.siteFooter__copy} key={`${footer.id}-copy-${index}`}>
            {paragraph}
          </p>
        ))}

        <div className={`row g-4 ${styles.siteFooter__menus}`}>
          {footer.footerMenus.map((menu) => (
            <div className="col-12 col-md-6" key={menu.id}>
              {!menu.hideTitle && menu.title ? <h3 className={styles.siteFooter__menuTitle}>{menu.title}</h3> : null}
              <ul className={`${styles.siteFooter__menu} d-grid gap-2`}>
                {menu.links.map((item) => {
                  if (item.kind === "dropdown") {
                    return item.links.map((subItem) => (
                      <li key={subItem.id}>
                        <FooterMenuItem link={subItem} />
                      </li>
                    ));
                  }

                  return (
                    <li key={item.id}>
                      <FooterMenuItem link={item} />
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
      {footer.subfooterCopy ? (
        <div className={styles.siteFooter__sub}>
          <div className={`container ${styles.siteFooter__subInner}`}>{footer.subfooterCopy}</div>
        </div>
      ) : null}
    </footer>
  );
}
