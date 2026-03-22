import type { CSSProperties } from "react";
import type { CmsBodyCopy, CmsRenderContext } from "../../../../lib/cms/contentful";
import { renderRichText } from "../../richText";
import styles from "./ComponentBodyCopy.module.scss";

type ComponentBodyCopyProps = {
  data: CmsBodyCopy["data"];
  renderContext?: CmsRenderContext;
};

export default function ComponentBodyCopy({ data, renderContext }: ComponentBodyCopyProps) {
  if (!data) {
    return null;
  }

  const blockTheme = data.blockTheme;
  const blockThemeStyles: Record<string, string | number> = {};
  if (blockTheme?.backgroundColor) {
    blockThemeStyles.backgroundColor = blockTheme.backgroundColor;
  }
  if (blockTheme?.backgroundImage?.url) {
    blockThemeStyles.backgroundImage = `url(${blockTheme.backgroundImage.url})`;
    blockThemeStyles.backgroundSize = "cover";
    blockThemeStyles.backgroundPosition = "center";
  }
  if (blockTheme?.blockPaddingTop === true) {
    blockThemeStyles.paddingTop = "4rem";
  }
  if (blockTheme?.blockPaddingTop === false) {
    blockThemeStyles.paddingTop = 0;
  }
  if (blockTheme?.blockPaddingBottom === false) {
    blockThemeStyles.paddingBottom = 0;
  }

  const blockThemeClasses = [blockTheme?.blockClass, blockTheme?.blockClass2]
    .filter(Boolean)
    .map((item) => styles[`bodyCopy--${item}`] || "")
    .filter(Boolean)
    .join(" ");

  const titleStyles: CSSProperties = {};
  if (blockTheme?.primaryTextColor) {
    titleStyles.color = blockTheme.primaryTextColor;
  }
  if (blockTheme?.titleBlockAlignment) {
    titleStyles.textAlign = blockTheme.titleBlockAlignment as CSSProperties["textAlign"];
  }

  const copyStyles: CSSProperties = {};
  if (blockTheme?.primaryTextColor) {
    copyStyles.color = blockTheme.primaryTextColor;
  }

  return (
    <section id={blockTheme?.blockClass2 || undefined} className={`${styles.bodyCopy} ${blockThemeClasses}`} style={blockThemeStyles as CSSProperties}>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-lg-10 col-xl-8">
            <div className={styles.bodyCopy__container}>
              {data.title && !blockTheme?.hideBlockTitle ? (
                blockTheme?.isPageTitle ? (
                  <h1 className={styles.bodyCopy__title} style={titleStyles}>
                    {data.title}
                  </h1>
                ) : (
                  <h2 className={styles.bodyCopy__title} style={titleStyles}>
                    {data.title}
                  </h2>
                )
              ) : null}
              <div className={styles.bodyCopy__copy} style={copyStyles}>
                {renderRichText(data.copy, {
                  classNames: {
                    paragraph: styles.bodyCopy__copyParagraph,
                    heading1: styles.bodyCopy__copyHeading1,
                    heading2: styles.bodyCopy__copyHeading2,
                    heading3: styles.bodyCopy__copyHeading3,
                    heading4: styles.bodyCopy__copyHeading4,
                    heading5: styles.bodyCopy__copyHeading5,
                    heading6: styles.bodyCopy__copyHeading6,
                    unorderedList: styles.bodyCopy__copyList,
                    orderedList: styles.bodyCopy__copyOrderedList,
                    listItem: styles.bodyCopy__copyListItem,
                    quote: styles.bodyCopy__copyQuote,
                    hr: styles.bodyCopy__copyHr,
                    link: styles.bodyCopy__copyLink,
                    bold: styles.bodyCopy__copyBold,
                    italic: styles.bodyCopy__copyItalic,
                    underline: styles.bodyCopy__copyUnderline,
                    code: styles.bodyCopy__copyCode,
                  },
                  contextualLinks: renderContext?.contextualLinks,
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
