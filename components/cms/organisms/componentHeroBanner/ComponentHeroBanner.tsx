import Image from "next/image";
import type { CSSProperties } from "react";
import type { CmsHeroBanner, CmsRenderContext } from "../../../../lib/cms/contentful";
import { renderRichText } from "../../richText";
import styles from "./ComponentHeroBanner.module.scss";

type ComponentHeroBannerProps = {
  data: CmsHeroBanner["data"];
  renderContext?: CmsRenderContext;
};

export default function ComponentHeroBanner({ data, renderContext }: ComponentHeroBannerProps) {
  if (!data) {
    return null;
  }

  const shouldHideTitle = data.blockTheme?.hideBlockTitle ?? data.hideTitle;
  const resolvedTextColor = data.blockTheme?.primaryTextColor || data.textColor || "white";
  const resolvedHighlightColor = data.blockTheme?.secondaryTextColor || data.highlightColor || "inherit";

  const styleVars: CSSProperties = {
    backgroundColor: data.blockTheme?.backgroundColor || "#4338ca",
    color: resolvedTextColor,
    "--highlight-color": resolvedHighlightColor,
    "--hero-overlay-color": data.blockTheme?.backgroundColor || "#ca723899",
  } as CSSProperties;

  const heroClassNames = [styles.heroBanner];
  for (const cls of [data.blockTheme?.blockClass, data.blockTheme?.blockClass2]) {
    if (!cls) {
      continue;
    }
    const moduleClass = styles[`heroBanner--${cls}`];
    if (moduleClass) {
      heroClassNames.push(moduleClass);
    }
    heroClassNames.push(cls);
  }

  return (
    <section className={heroClassNames.join(" ")} style={styleVars}>
      {data.backgroundImage?.url ? (
        <div className={styles.heroBanner__background}>
          <Image
            src={data.backgroundImage.url}
            alt={data.backgroundImage.title || data.title || "Hero banner background"}
            fill
            sizes="100vw"
            style={{ objectFit: "cover" }}
            priority
          />
          <div className={styles.heroBanner__backgroundOverlay} />
        </div>
      ) : null}

      {data.backgroundSvgCode ? (
        <div className={styles.heroBanner__svg} dangerouslySetInnerHTML={{ __html: data.backgroundSvgCode }} />
      ) : null}

      <div className={styles.heroBanner__content}>
        <div className="container">
          <div className="row">
            <div className="col-12 col-lg-10 col-xl-8">
              <div className={styles.heroBanner__inner}>
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
    </section>
  );
}
