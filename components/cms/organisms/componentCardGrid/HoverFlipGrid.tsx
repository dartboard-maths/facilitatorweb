"use client";

import Image from "next/image";
import { Children, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { CardGridCarouselRange, CardGridVisibleCount } from "./CardGridCarousel";
import styles from "./ComponentCardGrid.module.scss";

const RANGE_QUERY: Record<Exclude<CardGridCarouselRange, "all">, string> = {
  "md-up": "(min-width: 768px)",
  "md-dn": "(max-width: 991.98px)",
  sm: "(max-width: 767.98px)",
  lg: "(min-width: 992px)",
};

const FINE_HOVER_QUERY = "(hover: hover) and (pointer: fine)";
const DESKTOP_QUERY = "(min-width: 992px)";
const TABLET_QUERY = "(min-width: 768px)";

export type HoverFlipCard = {
  id: string;
  title: string;
  eyebrow: string;
  imageUrl?: string;
  imageAlt: string;
};

function Chevron({ direction }: { direction: "left" | "right" }) {
  const path = direction === "left" ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7";
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor">
      <path d={path} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function HoverFlipGrid({
  items,
  columns,
  range,
  slideClassName,
  children,
}: {
  items: HoverFlipCard[];
  columns: CardGridVisibleCount;
  range: CardGridCarouselRange;
  slideClassName: string;
  children: ReactNode;
}) {
  const panels = Children.toArray(children);
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<number | null>(null);
  const ignoreClick = useRef(false);
  const [page, setPage] = useState(0);
  const [carousel, setCarousel] = useState(false);
  const [fineHover, setFineHover] = useState(true);
  const [columnsInView, setColumnsInView] = useState(columns.desktop);
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(() => new Set());

  useEffect(() => {
    const rangeQuery = range === "all" ? "(min-width: 0px)" : RANGE_QUERY[range];
    const rangeMedia = window.matchMedia(rangeQuery);
    const hoverMedia = window.matchMedia(FINE_HOVER_QUERY);
    const desktopMedia = window.matchMedia(DESKTOP_QUERY);
    const tabletMedia = window.matchMedia(TABLET_QUERY);
    const update = () => {
      setCarousel(rangeMedia.matches);
      setFineHover(hoverMedia.matches);
      if (desktopMedia.matches) {
        setColumnsInView(columns.desktop);
      } else if (tabletMedia.matches) {
        setColumnsInView(columns.tablet);
      } else {
        setColumnsInView(columns.mobile);
      }
    };

    update();
    rangeMedia.addEventListener("change", update);
    hoverMedia.addEventListener("change", update);
    desktopMedia.addEventListener("change", update);
    tabletMedia.addEventListener("change", update);
    return () => {
      rangeMedia.removeEventListener("change", update);
      hoverMedia.removeEventListener("change", update);
      desktopMedia.removeEventListener("change", update);
      tabletMedia.removeEventListener("change", update);
    };
  }, [columns.desktop, columns.mobile, columns.tablet, range]);

  const pageCount = carousel ? Math.max(1, Math.ceil(items.length / Math.max(columnsInView, 1))) : 1;

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount - 1));
  }, [pageCount]);

  const goTo = (nextPage: number) => {
    setPage(Math.min(pageCount - 1, Math.max(0, nextPage)));
  };

  const toggleCard = (id: string) => {
    setOpenIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const trackStyle: CSSProperties & { "--flip-cols": number } = {
    "--flip-cols": Math.max(columnsInView, 1),
    transform: carousel && page > 0 ? `translate3d(-${page * 100}%, 0, 0)` : undefined,
  };

  return (
    <div>
      <div
        ref={viewportRef}
        className={carousel ? styles.flipViewportCarousel : undefined}
        onPointerDown={(event) => {
          if (!carousel || event.pointerType === "mouse") {
            return;
          }
          dragStart.current = event.clientX;
        }}
        onPointerUp={(event) => {
          if (dragStart.current === null) {
            return;
          }
          const delta = event.clientX - dragStart.current;
          dragStart.current = null;
          if (Math.abs(delta) < 40) {
            return;
          }
          ignoreClick.current = true;
          goTo(page + (delta < 0 ? 1 : -1));
        }}
        onPointerCancel={() => {
          dragStart.current = null;
        }}
      >
        <div
          className={`row g-4 ${styles.flipTrack}${carousel ? ` ${styles.flipTrackCarousel}` : ""}`}
          style={trackStyle}
        >
          {items.map((item, index) => (
            <div className={`${slideClassName} ${styles.flipSlide}`} key={item.id}>
              <article
                className={`${styles.flipCard}${openIds.has(item.id) ? ` ${styles.flipCardOpen}` : ""}`}
                onClick={(event) => {
                  if (ignoreClick.current) {
                    ignoreClick.current = false;
                    return;
                  }
                  if (fineHover || (event.target as HTMLElement).closest("a")) {
                    return;
                  }
                  toggleCard(item.id);
                }}
              >
                <div className={styles.flipFaces}>
                  <div className={styles.flipRest}>
                    {item.imageUrl ? (
                      <Image src={item.imageUrl} alt={item.imageAlt} fill sizes="(max-width: 768px) 90vw, 33vw" />
                    ) : null}
                  </div>
                  <div className={styles.flipHover}>
                    {item.eyebrow ? <p className={styles.flipEyebrow}>{item.eyebrow}</p> : null}
                    {item.title ? <h3 className={styles.flipTitle}>{item.title}</h3> : null}
                    <div className={styles.flipCopy}>{panels[index]}</div>
                  </div>
                </div>
              </article>
            </div>
          ))}
        </div>
      </div>
      {carousel && pageCount > 1 ? (
        <div className={styles.flipControls}>
          <button
            type="button"
            className={styles.flipNav}
            aria-label="Previous cards"
            disabled={page <= 0}
            onClick={() => goTo(page - 1)}
          >
            <Chevron direction="left" />
          </button>
          <button
            type="button"
            className={styles.flipNav}
            aria-label="Next cards"
            disabled={page >= pageCount - 1}
            onClick={() => goTo(page + 1)}
          >
            <Chevron direction="right" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
