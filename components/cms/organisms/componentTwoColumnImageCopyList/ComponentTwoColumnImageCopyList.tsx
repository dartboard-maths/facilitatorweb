import Image from "next/image";
import type { CSSProperties } from "react";
import type { CmsRenderContext, CmsTwoColumnImageCopyList } from "../../../../lib/cms/contentful";
import { renderRichText } from "../../richText";
import styles from "./ComponentTwoColumnImageCopyList.module.scss";

type ComponentTwoColumnImageCopyListProps = {
  data: CmsTwoColumnImageCopyList["data"];
  renderContext?: CmsRenderContext;
};

function getTextColorStyles(primary?: string, secondary?: string, useSecondary?: boolean): CSSProperties {
  if (useSecondary && secondary) {
    return { color: secondary };
  }
  if (primary) {
    return { color: primary };
  }
  return {};
}

export default function ComponentTwoColumnImageCopyList({ data, renderContext }: ComponentTwoColumnImageCopyListProps) {
  if (!data) {
    return null;
  }

  const blockTheme = data.blockTheme;
  const listTheme = data.list?.blockTheme;

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

  const shouldImageBeLeft = data.imageLeft ?? true;

  return (
    <section id={blockTheme?.blockClass2 || undefined} className={sectionClasses.join(" ")} style={sectionStyles as CSSProperties}>
      <div className="container">
        <div className="row align-items-center g-4">
          <div className={`col-12 col-md-5 ${shouldImageBeLeft ? "order-md-1" : "order-md-2"}`}>
            <div className={styles.twoColumn__imageWrapper}>
              {data.image?.url ? (
                <Image
                  src={data.image.url}
                  alt={data.image.title || data.title || "Two-column image"}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  style={{ objectFit: "cover", objectPosition: "center" }}
                />
              ) : null}
            </div>
          </div>

          <div className={`col-12 col-md-6 offset-md-1 ${shouldImageBeLeft ? "order-md-2" : "order-md-1"}`}>
            <div className={styles.twoColumn__textContent}>
              {data.preTitle ? (
                <p className={styles.twoColumn__preTitle} style={getTextColorStyles(blockTheme?.primaryTextColor, blockTheme?.secondaryTextColor, true)}>
                  {data.preTitle}
                </p>
              ) : null}

              {data.title && !blockTheme?.hideBlockTitle ? (
                blockTheme?.isPageTitle ? (
                  <h1 className={styles.twoColumn__title} style={getTextColorStyles(blockTheme?.primaryTextColor, blockTheme?.secondaryTextColor)}>
                    {data.title}
                  </h1>
                ) : (
                  <h2 className={styles.twoColumn__title} style={getTextColorStyles(blockTheme?.primaryTextColor, blockTheme?.secondaryTextColor)}>
                    {data.title}
                  </h2>
                )
              ) : null}

              {data.copy ? (
                <div className={styles.twoColumn__copy} style={getTextColorStyles(blockTheme?.primaryTextColor, blockTheme?.secondaryTextColor, true)}>
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

              {data.list?.title && !data.list.blockTheme?.hideBlockTitle ? (
                <h3 className={styles.twoColumn__listTitle} style={getTextColorStyles(blockTheme?.primaryTextColor, blockTheme?.secondaryTextColor)}>
                  {data.list.title}
                </h3>
              ) : null}

              {data.list?.copy ? (
                <p className={styles.twoColumn__listCopy} style={getTextColorStyles(blockTheme?.primaryTextColor, blockTheme?.secondaryTextColor, true)}>
                  {data.list.copy}
                </p>
              ) : null}

              {!!data.list?.listItems?.length ? (
                <div className={styles.twoColumn__listItems}>
                  {data.list.listItems.map((item) => {
                    const customClasses = item.customClass ? item.customClass.split(/\s+/).filter(Boolean) : [];
                    const listItemClassName = [
                      styles.listItem,
                      ...customClasses.map((token) => styles[`listItem--${token}`]).filter(Boolean),
                      ...customClasses,
                    ]
                      .filter(Boolean)
                      .join(" ");

                    const iconVars: CSSProperties = {
                      "--list-icon-color": listTheme?.primaryTextColor || blockTheme?.primaryTextColor || "#fff",
                      "--list-icon-circle-color": listTheme?.secondaryTextColor || "#684ce3",
                      "--list-item-bg": listTheme?.backgroundColor || "transparent",
                    } as CSSProperties;

                    return (
                      <article key={item.id} className={listItemClassName} style={iconVars}>
                        {item.image?.url ? (
                          <div className={styles.listItem__imageWrapper}>
                            <div className={styles.listItem__image}>
                              <Image
                                src={item.image.url}
                                alt={item.image.title || item.title || "List item image"}
                                fill
                                sizes="64px"
                                style={{ objectFit: "cover", objectPosition: "center" }}
                              />
                            </div>
                          </div>
                        ) : null}
                        <div className={styles.listItem__content}>
                          {item.title ? (
                            <h4 className={styles.listItem__title} style={getTextColorStyles(blockTheme?.primaryTextColor, blockTheme?.secondaryTextColor)}>
                              {item.title}
                            </h4>
                          ) : null}
                          {item.copy ? (
                            <div className={styles.listItem__copy} style={getTextColorStyles(blockTheme?.primaryTextColor, blockTheme?.secondaryTextColor, true)}>
                              {renderRichText(item.copy, {
                                classNames: {
                                  paragraph: styles.twoColumn__copyParagraph,
                                  link: styles.twoColumn__copyLink,
                                  bold: styles.twoColumn__copyBold,
                                },
                                contextualLinks: renderContext?.contextualLinks,
                              })}
                            </div>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
