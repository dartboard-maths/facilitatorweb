import type { CSSProperties } from "react";
import type { CmsHeroBanner, CmsRenderContext } from "../../../../lib/cms/contentful";
import { renderRichText } from "../../richText";
import HeroBannerMedia, { HeroScroll } from "./HeroBannerMedia";
import styles from "./ComponentHeroBanner.module.scss";

type ComponentHeroBannerProps = {
  data: CmsHeroBanner["data"];
  renderContext?: CmsRenderContext;
};

function themeTokens(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value.split(/\s+/).filter(Boolean);
}

export default function ComponentHeroBanner({ data, renderContext }: ComponentHeroBannerProps) {
  if (!data) {
    return null;
  }

  const tokens = [...themeTokens(data.blockTheme?.blockClass), ...themeTokens(data.blockTheme?.blockClass2)];
  const shouldHideTitle = data.blockTheme?.hideBlockTitle ?? false;
  const eyebrow = data.eyebrow.trim();
  const scrollText = data.scrollText.trim();
  const resolvedTextColor = data.blockTheme?.primaryTextColor || "white";
  const resolvedHighlightColor = data.blockTheme?.secondaryTextColor || "#e8772e";
  const hasMedia = data.backgroundImages.length > 0;

  const styleVars: CSSProperties = {
    backgroundColor: data.blockTheme?.backgroundColor || "#0f1a2e",
    color: resolvedTextColor,
    "--highlight-color": resolvedHighlightColor,
  } as CSSProperties;

  const heroClassNames = [styles.heroBanner];
  for (const token of tokens) {
    const moduleClass = styles[`heroBanner--${token}`];
    if (moduleClass) {
      heroClassNames.push(moduleClass);
    }
    heroClassNames.push(token);
  }

  return (
    <section className={heroClassNames.join(" ")} style={styleVars}>
      {hasMedia ? <HeroBannerMedia images={data.backgroundImages} /> : null}
      {hasMedia ? <div className={styles.heroBanner__overlay} aria-hidden="true" /> : null}

      {data.backgroundSvgCode ? (
        <div className={styles.heroBanner__svg} dangerouslySetInnerHTML={{ __html: data.backgroundSvgCode }} />
      ) : null}

      <div className={styles.heroBanner__content}>
        <div className="container">
          <div className={`row ${styles.heroBanner__row}`}>
            <div className="col-12 col-lg-10 col-xl-8">
              <div className={styles.heroBanner__inner}>
                {eyebrow ? <p className={styles.heroBanner__eyebrow}>{eyebrow}</p> : null}
                {data.title ? (
                  <h1 className={`${styles.heroBanner__title} ${shouldHideTitle ? styles["heroBanner__title--hidden"] : ""}`}>
                    {data.title}
                  </h1>
                ) : null}
                {data.copy ? (
                  <div className={styles.heroBanner__copy}>
                    {renderRichText(data.copy, {
                      classNames: {
                        paragraph: styles.heroBanner__copyParagraph,
                        heading1: styles.heroBanner__copyHeading1,
                        heading2: styles.heroBanner__copyHeading2,
                        heading3: styles.heroBanner__copyHeading3,
                        link: styles.heroBanner__copyLink,
                        bold: styles.heroBanner__copyBold,
                        code: styles.heroBanner__copyCode,
                      },
                      contextualLinks: renderContext?.contextualLinks,
                    })}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {scrollText ? <HeroScroll label={scrollText} /> : null}
    </section>
  );
}
