"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type CSSProperties, type MouseEvent, type KeyboardEvent } from "react";
import styles from "./ComponentCardGrid.module.scss";

export type HoverCardData = {
  id: string;
  title: string;
  text: string;
  imageUrl?: string;
  buttonLabel?: string;
  buttonUrl?: string;
  external: boolean;
};

const HOVER_QUERY = "(hover: hover) and (pointer: fine) and (min-width: 768px)";

function canHover(): boolean {
  return window.matchMedia(HOVER_QUERY).matches;
}

function HintArrow() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 17l9-9M8 8h8v8" />
    </svg>
  );
}

function CtaArrow() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function HitLink({ card }: { card: HoverCardData }) {
  if (!card.buttonUrl) {
    return null;
  }
  const label = card.buttonLabel || card.title;
  if (card.external) {
    return <a className={styles.hoverCard__hit} href={card.buttonUrl} aria-label={label} target="_blank" rel="noreferrer" />;
  }
  return <Link className={styles.hoverCard__hit} href={card.buttonUrl} aria-label={label} />;
}

export function HoverCardList({ cards }: { cards: HoverCardData[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const grow = cards.length === 2 ? "1.85" : cards.length === 3 ? "2.2" : "2.55";

  const onEnter = (index: number) => {
    if (canHover()) {
      setActiveIndex(index);
    }
  };

  const onClick = (event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>, index: number) => {
    const link = (event.target as HTMLElement).closest("a");
    if (!canHover()) {
      if (index !== activeIndex) {
        if (link) {
          event.preventDefault();
        }
        setActiveIndex(index);
        return;
      }
      if (link) {
        return;
      }
      setActiveIndex(-1);
      return;
    }
    if (!link) {
      setActiveIndex(index);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>, index: number) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    if ((event.target as HTMLElement).closest("a")) {
      return;
    }
    event.preventDefault();
    onClick(event, index);
  };

  return (
    <div className={styles.hoverList} data-count={cards.length} style={{ "--hover-grow": grow } as CSSProperties}>
      {cards.map((card, index) => {
        const active = index === activeIndex;
        return (
          <article
            key={card.id}
            className={`${styles.hoverCard} ${active ? styles.hoverCardActive : ""}`}
            data-hover-card
            tabIndex={card.buttonUrl ? -1 : 0}
            aria-expanded={active}
            onMouseEnter={() => onEnter(index)}
            onFocus={() => onEnter(index)}
            onClick={(event) => onClick(event, index)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            <div className={styles.hoverCard__photo} aria-hidden="true">
              {card.imageUrl ? (
                <Image src={card.imageUrl} alt="" fill sizes="(max-width: 768px) 100vw, 40vw" />
              ) : null}
            </div>
            <div className={styles.hoverCard__shade} aria-hidden="true" />
            <HitLink card={card} />
            <div className={styles.hoverCard__inner}>
              <div className={styles.hoverCard__copy}>
                {card.title ? <h3 className={styles.hoverCard__title}>{card.title}</h3> : null}
                {card.text ? <p className={styles.hoverCard__text}>{card.text}</p> : null}
              </div>
              <div className={styles.hoverCard__footer}>
                {card.buttonLabel ? (
                  <span className={styles.hoverCard__cta} aria-hidden={card.buttonUrl ? true : undefined}>
                    <span>{card.buttonLabel}</span>
                    <CtaArrow />
                  </span>
                ) : null}
                <span className={styles.hoverCard__hint}>
                  <span className={styles.hoverCard__hintHover}>Hover to reveal</span>
                  <span className={styles.hoverCard__hintTap}>Tap to reveal</span>
                  <span className={styles.hoverCard__hintIcon} aria-hidden="true">
                    <HintArrow />
                  </span>
                </span>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
