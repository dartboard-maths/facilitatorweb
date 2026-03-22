import Link from "next/link";
import Image from "next/image";
import type { CSSProperties } from "react";
import type { CmsCardGrid, CmsLink, CmsRenderContext } from "../../../../lib/cms/contentful";
import { renderRichText } from "../../richText";
import styles from "./ComponentCardGrid.module.scss";

type ComponentCardGridProps = {
  data: CmsCardGrid["data"];
  renderContext?: CmsRenderContext;
};

function isExternalLink(url: string, explicitExternal: boolean): boolean {
  if (explicitExternal) {
    return true;
  }

  return /^https?:\/\//i.test(url) || url.startsWith("mailto:") || url.startsWith("tel:");
}

function CtaLink({ link }: { link: CmsLink }) {
  const className = styles.cardGrid__ctaLink;
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

export default function ComponentCardGrid({ data, renderContext }: ComponentCardGridProps) {
  if (!data) {
    return null;
  }

  const blockTheme = data.blockTheme;
  const sectionStyle = {} as CSSProperties;

  if (blockTheme?.backgroundColor) {
    sectionStyle.backgroundColor = blockTheme.backgroundColor;
  }
  if (blockTheme?.backgroundImage?.url) {
    sectionStyle.backgroundImage = `url(${blockTheme.backgroundImage.url})`;
    sectionStyle.backgroundSize = "cover";
    sectionStyle.backgroundPosition = "center";
  }
  if (blockTheme?.primaryTextColor) {
    sectionStyle.color = blockTheme.primaryTextColor;
  }

  const toSpan = (value: string, fallback: number) => {
    const parsed = Number.parseInt(value, 10);
    const count = Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
    const span = Math.floor(12 / count);
    return span >= 1 && span <= 12 ? span : 12;
  };

  const mobileSpan = toSpan(data.cardsMobile || "1", 1);
  const tabletSpan = toSpan(data.cardsTablet || "2", 2);
  const desktopSpan = toSpan(data.cardsDesktop || "3", 3);
  const cardColClass = `col-${mobileSpan} col-md-${tabletSpan} col-lg-${desktopSpan}`;

  return (
    <section className={styles.cardGrid} style={sectionStyle}>
      <div className="container">
        {data.title ? <h2 className={styles.cardGrid__title}>{data.title}</h2> : null}
        {data.copy ? <p className={styles.cardGrid__intro}>{data.copy}</p> : null}

        <div className={`${styles.cardGrid__grid} row g-4`}>
          {data.cards.map((card) => (
            <div className={cardColClass} key={card.id}>
              <article className={styles.cardGrid__card}>
                {card.image?.url ? (
                  <div className={styles.card__imageWrapper}>
                    <div className={styles.card__image}>
                      <Image src={card.image.url} alt={card.image.title || card.title} width={800} height={420} />
                    </div>
                  </div>
                ) : null}
                <div className={styles.cardGrid__cardBody}>
                  <h3 className={styles.cardGrid__cardTitle}>{card.title}</h3>
                  {card.subHeading ? <p className={styles.cardGrid__cardSubHeading}>{card.subHeading}</p> : null}
                  {card.description ? <p className={styles.cardGrid__cardDescription}>{card.description}</p> : null}
                  <div className={styles.cardGrid__cardCopy}>
                    {renderRichText(card.copy, {
                      classNames: {
                        paragraph: styles.cardGrid__copyParagraph,
                        heading3: styles.cardGrid__copyHeading3,
                        unorderedList: styles.cardGrid__copyList,
                        orderedList: styles.cardGrid__copyOrderedList,
                        listItem: styles.cardGrid__copyListItem,
                        link: styles.cardGrid__copyLink,
                        bold: styles.cardGrid__copyBold,
                      },
                      contextualLinks: renderContext?.contextualLinks,
                    })}
                  </div>
                  {card.buttons.length > 0 ? (
                    <div className={styles.cardGrid__ctaRow}>
                      {card.buttons.map((button) => (
                        <CtaLink key={button.id} link={button} />
                      ))}
                    </div>
                  ) : null}
                </div>
              </article>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
