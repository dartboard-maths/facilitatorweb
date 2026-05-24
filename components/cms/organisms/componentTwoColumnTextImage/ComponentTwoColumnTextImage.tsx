import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import type { CmsRenderContext, CmsTwoColumnTextImage } from "../../../../lib/cms/contentful";
import { renderRichText } from "../../richText";
import styles from "./ComponentTwoColumnTextImage.module.scss";

type ComponentTwoColumnTextImageProps = {
  data: CmsTwoColumnTextImage["data"];
  renderContext?: CmsRenderContext;
};

function isExternalUrl(url: string): boolean {
  return /^https?:\/\//i.test(url) || url.startsWith("mailto:") || url.startsWith("tel:");
}

export default function ComponentTwoColumnTextImage({ data, renderContext }: ComponentTwoColumnTextImageProps) {
  if (!data) {
    return null;
  }

  const blockTheme = data.blockTheme;
  const imageOnLeft = data.imageOnLeft ?? true;

  const sectionClasses = [styles.twoColumn];
  for (const cls of [blockTheme?.blockClass, blockTheme?.blockClass2]) {
    if (!cls) {
      continue;
    }
    const moduleClass = styles[`twoColumn--${cls}`];
    if (moduleClass) {
      sectionClasses.push(moduleClass);
    }
    sectionClasses.push(cls);
  }

  const sectionStyles: Record<string, string | number> = {};
  if (blockTheme?.backgroundColor) {
    sectionStyles.backgroundColor = blockTheme.backgroundColor;
  }
  if (blockTheme?.backgroundImage?.url) {
    sectionStyles.backgroundImage = `url(${blockTheme.backgroundImage.url})`;
    sectionStyles.backgroundSize = "cover";
    sectionStyles.backgroundPosition = "center";
    sectionStyles.backgroundRepeat = "no-repeat";
  }
  if (blockTheme?.blockPaddingTop === true) {
    sectionStyles.paddingTop = "4rem";
  }
  if (blockTheme?.blockPaddingTop === false) {
    sectionStyles.paddingTop = 0;
  }
  if (blockTheme?.blockPaddingBottom === false) {
    sectionStyles.paddingBottom = 0;
  }

  const titleStyles: CSSProperties = {};
  if (blockTheme?.primaryTextColor) {
    titleStyles.color = blockTheme.primaryTextColor;
  }
  if (blockTheme?.titleBlockAlignment) {
    titleStyles.textAlign = blockTheme.titleBlockAlignment as CSSProperties["textAlign"];
  }

  const copyStyles: CSSProperties = {};
  if (blockTheme?.secondaryTextColor) {
    copyStyles.color = blockTheme.secondaryTextColor;
  } else if (blockTheme?.primaryTextColor) {
    copyStyles.color = blockTheme.primaryTextColor;
  }

  const ctaUrl = (data.ctaUrl || "").trim();
  const ctaLabel = (data.ctaLabel || "").trim();
  const ctaClass = data.ctaCustomClass ? styles[`twoColumn__cta--${data.ctaCustomClass}`] || data.ctaCustomClass : "";

  return (
    <section id={blockTheme?.blockClass2 || undefined} className={sectionClasses.join(" ")} style={sectionStyles as CSSProperties}>
      <div className="container">
        <div className="row align-items-center g-4">
          <div className={`col-12 col-md-6 ${imageOnLeft ? "order-md-1" : "order-md-2"}`}>
            <div className={styles.twoColumn__imageWrapper}>
              {data.image?.url ? (
                <div className={styles.twoColumn__image}>
                  <Image
                    src={data.image.url}
                    alt={data.image.title || data.title || "Two-column content image"}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    style={{ objectFit: "cover" }}
                  />
                </div>
              ) : null}
              {data.imageSvgOverlay ? (
                <div className={styles.twoColumn__svgOverlay} dangerouslySetInnerHTML={{ __html: data.imageSvgOverlay }} />
              ) : null}
            </div>
          </div>
          <div className={`col-12 col-md-6 ${imageOnLeft ? "order-md-2" : "order-md-1"}`}>
            <div className={styles.twoColumn__textContent}>
              {data.title && !blockTheme?.hideBlockTitle ? (
                blockTheme?.isPageTitle ? (
                  <h1 className={styles.twoColumn__title} style={titleStyles}>
                    {data.title}
                  </h1>
                ) : (
                  <h2 className={styles.twoColumn__title} style={titleStyles}>
                    {data.title}
                  </h2>
                )
              ) : null}

              {data.introCopy ? (
                <p className={styles.twoColumn__introCopy} style={copyStyles}>
                  {data.introCopy}
                </p>
              ) : null}

              {data.copy ? (
                <div className={styles.twoColumn__copy} style={copyStyles}>
                  {renderRichText(data.copy, {
                    classNames: {
                      paragraph: styles.twoColumn__copyParagraph,
                      heading1: styles.twoColumn__copyHeading1,
                      heading2: styles.twoColumn__copyHeading2,
                      heading3: styles.twoColumn__copyHeading3,
                      heading4: styles.twoColumn__copyHeading4,
                      heading5: styles.twoColumn__copyHeading5,
                      heading6: styles.twoColumn__copyHeading6,
                      unorderedList: styles.twoColumn__copyList,
                      orderedList: styles.twoColumn__copyOrderedList,
                      listItem: styles.twoColumn__copyListItem,
                      quote: styles.twoColumn__copyQuote,
                      hr: styles.twoColumn__copyHr,
                      link: styles.twoColumn__copyLink,
                      bold: styles.twoColumn__copyBold,
                      code: styles.twoColumn__copyCode,
                    },
                    contextualLinks: renderContext?.contextualLinks,
                  })}
                </div>
              ) : null}

              {ctaUrl && ctaLabel ? (
                <div className={styles.twoColumn__ctaWrapper}>
                  {isExternalUrl(ctaUrl) ? (
                    <a href={ctaUrl} target="_blank" rel="noopener noreferrer" className={`${styles.twoColumn__cta} ${ctaClass}`.trim()}>
                      {ctaLabel}
                    </a>
                  ) : (
                    <Link href={ctaUrl} className={`${styles.twoColumn__cta} ${ctaClass}`.trim()}>
                      {ctaLabel}
                    </Link>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
