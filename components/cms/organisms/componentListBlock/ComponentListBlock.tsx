import Image from "next/image";
import type { CSSProperties } from "react";
import type { CmsListBlock, CmsRenderContext } from "../../../../lib/cms/contentful";
import { renderRichText } from "../../richText";
import styles from "./ComponentListBlock.module.scss";

type ComponentListBlockProps = {
  data: CmsListBlock["data"];
  renderContext?: CmsRenderContext;
};

export default function ComponentListBlock({ data, renderContext }: ComponentListBlockProps) {
  if (!data) {
    return null;
  }

  const blockTheme = data.blockTheme;
  const containerClassArray = [styles.listBlock];
  for (const cls of [blockTheme?.blockClass, blockTheme?.blockClass2]) {
    if (!cls) {
      continue;
    }
    const moduleClass = styles[`listBlock--${cls}`];
    if (moduleClass) {
      containerClassArray.push(moduleClass);
    }
    containerClassArray.push(cls);
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
  if (blockTheme?.primaryTextColor) {
    sectionStyles["--list-icon-color"] = blockTheme.primaryTextColor;
  }
  if (blockTheme?.secondaryTextColor) {
    sectionStyles["--list-icon-circle-color"] = blockTheme.secondaryTextColor;
  }
  if (blockTheme?.backgroundColor) {
    sectionStyles["--list-item-bg"] = blockTheme.backgroundColor;
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

  const titleStyle: CSSProperties = {};
  if (blockTheme?.primaryTextColor) {
    titleStyle.color = blockTheme.primaryTextColor;
  }
  if (blockTheme?.titleBlockAlignment) {
    titleStyle.textAlign = blockTheme.titleBlockAlignment as CSSProperties["textAlign"];
  }

  const copyStyle: CSSProperties = {};
  if (blockTheme?.primaryTextColor) {
    copyStyle.color = blockTheme.primaryTextColor;
  }

  return (
    <section id={blockTheme?.blockClass2 || undefined} className={containerClassArray.join(" ")} style={sectionStyles as CSSProperties}>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-lg-10">
            <div className={styles.listBlock__container}>
              {data.title && !blockTheme?.hideBlockTitle ? (
                blockTheme?.isPageTitle ? (
                  <h1 className={styles.listBlock__title} style={titleStyle}>
                    {data.title}
                  </h1>
                ) : (
                  <h2 className={styles.listBlock__title} style={titleStyle}>
                    {data.title}
                  </h2>
                )
              ) : null}
              {data.copy ? <p className={styles.listBlock__copy} style={copyStyle}>{data.copy}</p> : null}
              <div className={`${styles.listBlock__items} row g-3`}>
                {data.listItems.map((item) => (
                  <div className="col-12 col-md-6" key={item.id}>
                    <article className={`${styles.listItem} ${item.customClass ? styles[`listItem--${item.customClass}`] || item.customClass : ""}`}>
                      {item.image?.url ? (
                        <div className={styles.listItem__imageWrapper}>
                          <div className={styles.listItem__image}>
                            <Image src={item.image.url} alt={item.image.title || item.title} width={64} height={64} className={styles.listItem__imageStandard} />
                          </div>
                        </div>
                      ) : null}
                      <div className={styles.listItem__content}>
                        <h3 className={styles.listItem__title}>{item.title}</h3>
                        <div className={styles.listItem__copy}>
                          {renderRichText(item.copy, {
                            classNames: {
                              paragraph: styles.listBlock__copyParagraph,
                              heading1: styles.listBlock__copyHeading1,
                              heading2: styles.listBlock__copyHeading2,
                              heading3: styles.listBlock__copyHeading3,
                              heading4: styles.listBlock__copyHeading4,
                              heading5: styles.listBlock__copyHeading5,
                              heading6: styles.listBlock__copyHeading6,
                              unorderedList: styles.listBlock__copyList,
                              orderedList: styles.listBlock__copyOrderedList,
                              listItem: styles.listBlock__copyListItem,
                              quote: styles.listBlock__copyQuote,
                              hr: styles.listBlock__copyHr,
                              link: styles.listBlock__copyLink,
                            },
                            contextualLinks: renderContext?.contextualLinks,
                          })}
                        </div>
                      </div>
                    </article>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
