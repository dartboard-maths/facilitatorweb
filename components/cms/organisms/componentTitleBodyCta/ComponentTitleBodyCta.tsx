import Link from "next/link";
import type { CSSProperties } from "react";
import type { CmsLink, CmsRenderContext, CmsTitleBodyCta } from "../../../../lib/cms/contentful";
import { renderRichText } from "../../richText";
import styles from "./ComponentTitleBodyCta.module.scss";

type ComponentTitleBodyCtaProps = {
  data: CmsTitleBodyCta["data"];
  renderContext?: CmsRenderContext;
};

function isExternalLink(url: string, explicitExternal: boolean): boolean {
  if (explicitExternal) {
    return true;
  }

  return /^https?:\/\//i.test(url) || url.startsWith("mailto:") || url.startsWith("tel:");
}

function CtaLink({ link }: { link: CmsLink }) {
  const classNames = [
    styles.titleBodyCta__cta,
    link.customClass ? styles[`titleBodyCta__cta--${link.customClass}`] : "",
    link.customClass || "",
  ]
    .filter(Boolean)
    .join(" ");

  if (isExternalLink(link.url, link.externalLink)) {
    return (
      <a className={classNames} href={link.url} target="_blank" rel="noreferrer">
        {link.label}
      </a>
    );
  }

  return (
    <Link className={classNames} href={link.url}>
      {link.label}
    </Link>
  );
}

export default function ComponentTitleBodyCta({ data, renderContext }: ComponentTitleBodyCtaProps) {
  if (!data) {
    return null;
  }

  const blockTheme = data.blockTheme;
  const hasCtas = data.ctaBlock.length > 0;
  const isBoxed =
    blockTheme?.blockClass === "boxed" ||
    blockTheme?.blockClass2 === "boxed" ||
    blockTheme?.blockClass === "boxed--stacked" ||
    blockTheme?.blockClass2 === "boxed--stacked";

  const backgroundStyles: Record<string, string> = {};
  if (blockTheme?.backgroundColor) {
    backgroundStyles.backgroundColor = blockTheme.backgroundColor;
  }
  if (blockTheme?.backgroundImage?.url) {
    backgroundStyles.backgroundImage = `url(${blockTheme.backgroundImage.url})`;
    backgroundStyles.backgroundSize = "cover";
    backgroundStyles.backgroundPosition = "center";
    backgroundStyles.backgroundRepeat = "no-repeat";
  }

  const sectionStyles: Record<string, string | number> = {};
  if (blockTheme?.blockPaddingTop === true) {
    sectionStyles.paddingTop = "4rem";
  }
  if (blockTheme?.blockPaddingTop === false) {
    sectionStyles.paddingTop = 0;
  }
  if (blockTheme?.blockPaddingBottom === false) {
    sectionStyles.paddingBottom = 0;
  }

  const blockThemeClasses = [blockTheme?.blockClass, blockTheme?.blockClass2]
    .filter(Boolean)
    .map((item) => styles[`titleBodyCta--${item}`] || "")
    .filter(Boolean)
    .join(" ");

  const primaryTextStyles: CSSProperties = blockTheme?.primaryTextColor ? { color: blockTheme.primaryTextColor } : {};
  const titleTextStyles: CSSProperties = {
    ...primaryTextStyles,
    ...(blockTheme?.titleBlockAlignment ? { textAlign: blockTheme.titleBlockAlignment as CSSProperties["textAlign"] } : {}),
  };

  return (
    <section
      id={blockTheme?.blockClass2 || undefined}
      className={`${styles.titleBodyCta} ${blockThemeClasses}`}
      style={{ ...sectionStyles, ...(isBoxed ? {} : backgroundStyles) } as CSSProperties}
    >
      <div className={`container ${styles.titleBodyCta__container}`} style={(isBoxed ? backgroundStyles : undefined) as CSSProperties | undefined}>
        <div className="row">
          <div className={hasCtas ? "col-9" : "col-12"}>
            {data.title && !blockTheme?.hideBlockTitle ? (
              blockTheme?.isPageTitle ? (
                <h1 className={styles.titleBodyCta__title} style={titleTextStyles}>
                  {data.title}
                </h1>
              ) : (
                <h2 className={styles.titleBodyCta__title} style={titleTextStyles}>
                  {data.title}
                </h2>
              )
            ) : null}

            <div className={styles.titleBodyCta__copy} style={primaryTextStyles}>
              {renderRichText(data.copy, {
                classNames: {
                  paragraph: styles.titleBodyCta__copyParagraph,
                  heading1: styles.titleBodyCta__copyHeading1,
                  heading2: styles.titleBodyCta__copyHeading2,
                  heading3: styles.titleBodyCta__copyHeading3,
                  heading4: styles.titleBodyCta__copyHeading4,
                  heading5: styles.titleBodyCta__copyHeading5,
                  heading6: styles.titleBodyCta__copyHeading6,
                  unorderedList: styles.titleBodyCta__copyList,
                  orderedList: styles.titleBodyCta__copyOrderedList,
                  listItem: styles.titleBodyCta__copyListItem,
                  quote: styles.titleBodyCta__copyQuote,
                  hr: styles.titleBodyCta__copyHr,
                  link: styles.titleBodyCta__copyLink,
                  bold: styles.titleBodyCta__copyBold,
                  code: styles.titleBodyCta__copyCode,
                },
                contextualLinks: renderContext?.contextualLinks,
              })}
            </div>
          </div>

          {hasCtas ? (
            <ul className={`col-3 ${styles.titleBodyCta__ctaColumn}`}>
              {data.ctaBlock.map((cta) => (
                <li key={cta.id} className={styles.titleBodyCta__ctaItem}>
                  <CtaLink link={cta} />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}
