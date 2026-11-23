import Link from "next/link";
import Image from "next/image";
import type { CSSProperties } from "react";
import type { CmsBlockTheme, CmsCard, CmsCardGrid, CmsLink, CmsRenderContext } from "../../../../lib/cms/contentful";
import { renderRichText } from "../../richText";
import {
  CardGridCarousel,
  type CardGridCarouselRange,
  type CardGridVisibleCount,
} from "./CardGridCarousel";
import { HoverCardList, type HoverCardData } from "./HoverCardList";
import { HoverFlipGrid } from "./HoverFlipGrid";
import { MediaAccordion } from "./MediaAccordion";
import styles from "./ComponentCardGrid.module.scss";

type ComponentCardGridProps = {
  data: CmsCardGrid["data"];
  renderContext?: CmsRenderContext;
};

const CAROUSEL_RANGES: Record<string, Exclude<CardGridCarouselRange, "all">> = {
  "carousel-md-up": "md-up",
  "carousel-md-dn": "md-dn",
  "carousel-sm": "sm",
  "carousel-lg": "lg",
};

function isExternalLink(url: string, explicitExternal: boolean): boolean {
  if (explicitExternal) {
    return true;
  }

  return /^https?:\/\//i.test(url) || url.startsWith("mailto:") || url.startsWith("tel:");
}

function CtaArrow() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function CtaLink({ link, glass = false }: { link: CmsLink; glass?: boolean }) {
  const className = glass ? styles.coverCard__cta : styles.cardGrid__ctaLink;
  if (isExternalLink(link.url, link.externalLink)) {
    return (
      <a className={className} href={link.url} target="_blank" rel="noreferrer">
        <span>{link.label}</span>
        {glass ? <CtaArrow /> : null}
      </a>
    );
  }

  return (
    <Link className={className} href={link.url}>
      <span>{link.label}</span>
      {glass ? <CtaArrow /> : null}
    </Link>
  );
}

function blockTokens(theme?: CmsBlockTheme): string[] {
  return [theme?.blockClass, theme?.blockClass2].flatMap((value) =>
    value ? value.split(/\s+/).filter(Boolean) : [],
  );
}

function cardGridLayout(theme?: CmsBlockTheme): {
  layout: "grid" | "carousel" | "hover" | "media" | "hoverCard";
  range: CardGridCarouselRange;
} {
  let layout: "grid" | "carousel" | "hover" | "media" | "hoverCard" = "grid";
  let range: CardGridCarouselRange = "all";
  let explicitRange = false;
  for (const token of blockTokens(theme)) {
    if (token === "carousel-block") {
      layout = "carousel";
    }
    if (token === "hover-carousel-block") {
      layout = "hover";
    }
    if (token === "media-accordion-block") {
      layout = "media";
    }
    if (token === "hover-card-block") {
      layout = "hoverCard";
    }
    const nextRange = CAROUSEL_RANGES[token];
    if (nextRange && layout !== "hover" && layout !== "media") {
      if (layout !== "hoverCard") {
        layout = "carousel";
      }
      range = nextRange;
      explicitRange = true;
    }
  }
  if (layout === "hoverCard" && !explicitRange) {
    range = "sm";
  }
  return { layout, range };
}

function sectionClassNames(theme: CmsBlockTheme | undefined): string {
  const names = [styles.cardGrid];
  for (const token of blockTokens(theme)) {
    const moduleClass = styles[`cardGrid--${token}`];
    if (moduleClass && !names.includes(moduleClass)) {
      names.push(moduleClass);
    }
    if (!names.includes(token)) {
      names.push(token);
    }
  }
  return names.join(" ");
}

function visibleCount(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value || "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return parsed;
}

function columnSpan(value: string | undefined, fallback: number): number {
  const count = visibleCount(value, fallback);
  const span = Math.floor(12 / count);
  return span >= 1 && span <= 12 ? span : 12;
}

const IMAGE_CAROUSEL_CARD = "bg-image-carousel-card";
const MEDIA_ACCENTS = ["#7dcf6a", "#4f7cff", "#e8772e", "#0f766e"];

function cardTokens(card: CmsCard): string[] {
  return card.customClass ? card.customClass.split(/\s+/).filter(Boolean) : [];
}

function CardArticle({ card, renderContext }: { card: CmsCard; renderContext?: CmsRenderContext }) {
  const tokens = cardTokens(card);
  if (tokens.includes(IMAGE_CAROUSEL_CARD)) {
    return <ImageCarouselCard card={card} tokens={tokens} />;
  }

  return (
    <article className={[styles.cardGrid__card, ...tokens].join(" ")}>
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
  );
}

function ImageCarouselCard({ card, tokens }: { card: CmsCard; tokens: string[] }) {
  const button = card.buttons[0];
  return (
    <article className={[styles.coverCard, ...tokens].join(" ")}>
      {card.image?.url ? (
        <Image
          className={styles.coverCard__photo}
          src={card.image.url}
          alt=""
          fill
          sizes="(max-width: 768px) 90vw, 950px"
        />
      ) : null}
      <div className={styles.coverCard__overlay} />
      <div className={styles.coverCard__content}>
        {card.subHeading ? <span className={styles.coverCard__badge}>{card.subHeading}</span> : null}
        <div className={styles.coverCard__main}>
          {card.title ? <h3 className={styles.coverCard__title}>{card.title}</h3> : null}
          {card.description ? <p className={styles.coverCard__text}>{card.description}</p> : null}
        </div>
        {button ? <CtaLink link={button} glass /> : <span />}
      </div>
    </article>
  );
}

export default function ComponentCardGrid({ data, renderContext }: ComponentCardGridProps) {
  if (!data) {
    return null;
  }

  const blockTheme = data.blockTheme;
  const { layout, range } = cardGridLayout(blockTheme);
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

  const visible: CardGridVisibleCount = {
    mobile: visibleCount(data.cardsMobile, 1),
    tablet: visibleCount(data.cardsTablet, 2),
    desktop: visibleCount(data.cardsDesktop, 3),
  };
  const cardColClass = `col-${columnSpan(data.cardsMobile, 1)} col-md-${columnSpan(data.cardsTablet, 2)} col-lg-${columnSpan(data.cardsDesktop, 3)}`;
  const cards = data.cards.map((card) => (
    <CardArticle key={card.id} card={card} renderContext={renderContext} />
  ));

  const sectionClass = [
    sectionClassNames(blockTheme),
    layout === "carousel" ? styles["cardGrid--coverflow"] : "",
    layout === "hover" ? styles["cardGrid--hover"] : "",
    layout === "media" ? styles["cardGrid--media"] : "",
    layout === "hoverCard" ? styles["cardGrid--hoverCard"] : "",
  ]
    .filter(Boolean)
    .join(" ");
  const hoverCards: HoverCardData[] = data.cards.map((card) => {
    const button = card.buttons[0];
    return {
      id: card.id,
      title: card.title,
      text: card.description,
      imageUrl: card.image?.url,
      buttonLabel: button?.label,
      buttonUrl: button?.url,
      external: button ? isExternalLink(button.url, button.externalLink) : false,
    };
  });
  if (layout === "hover") {
    const themeStyle = sectionStyle as CSSProperties & Record<"--hover-overlay-color" | "--hover-overlay-opacity", string>;
    themeStyle["--hover-overlay-color"] = blockTheme?.backgroundColor || "#0f1a2e";
    themeStyle["--hover-overlay-opacity"] = "70%";
  }

  return (
    <section className={sectionClass} style={sectionStyle}>
      <div className="container">
        {(layout === "media" || layout === "hoverCard") && blockTheme?.title && blockTheme.title !== data.title ? (
          <p className={styles.cardGrid__eyebrow}>{blockTheme.title}</p>
        ) : null}
        {data.title ? <h2 className={styles.cardGrid__title}>{data.title}</h2> : null}
        {data.copy ? <p className={styles.cardGrid__intro}>{data.copy}</p> : null}
        {layout === "hover" ? <HoverCardList cards={hoverCards} /> : null}
        {layout === "media" ? (
          <MediaAccordion
            items={data.cards.map((card, index) => ({
              id: card.id,
              title: card.title,
              imageUrl: card.image?.url,
              imageAlt: card.image?.title || card.title,
              accent: MEDIA_ACCENTS[index % MEDIA_ACCENTS.length],
            }))}
          >
            {data.cards.map((card) => (
              <div key={card.id}>
                {card.description ? <p>{card.description}</p> : null}
                {renderRichText(card.copy, {
                  classNames: {
                    paragraph: styles.mediaPanel__paragraph,
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
            ))}
          </MediaAccordion>
        ) : null}
        {layout === "hoverCard" ? (
          <HoverFlipGrid
            items={data.cards.map((card) => ({
              id: card.id,
              title: card.title,
              eyebrow: card.subHeading,
              imageUrl: card.image?.url,
              imageAlt: card.image?.title || card.title,
            }))}
            columns={visible}
            range={range}
            slideClassName={cardColClass}
          >
            {data.cards.map((card) => (
              <div key={card.id}>
                {card.copy
                  ? renderRichText(card.copy, {
                      classNames: {
                        paragraph: styles.flipCopyParagraph,
                        heading3: styles.cardGrid__copyHeading3,
                        unorderedList: styles.cardGrid__copyList,
                        orderedList: styles.cardGrid__copyOrderedList,
                        listItem: styles.cardGrid__copyListItem,
                        link: styles.cardGrid__copyLink,
                        bold: styles.cardGrid__copyBold,
                      },
                      contextualLinks: renderContext?.contextualLinks,
                    })
                  : card.description
                    ? <p className={styles.flipCopyParagraph}>{card.description}</p>
                    : null}
              </div>
            ))}
          </HoverFlipGrid>
        ) : null}
        {layout === "carousel" || layout === "hover" || layout === "media" || layout === "hoverCard" ? null : (
          <div className={`${styles.cardGrid__grid} row g-4`}>
            {data.cards.map((card) => (
              <div className={cardColClass} key={card.id}>
                <CardArticle card={card} renderContext={renderContext} />
              </div>
            ))}
          </div>
        )}
      </div>
      {layout === "carousel" ? (
        <CardGridCarousel
          label={data.title || "Cards"}
          labels={data.cards.map((card) => card.title)}
          visible={visible}
          range={range}
        >
          {cards}
        </CardGridCarousel>
      ) : null}
    </section>
  );
}
