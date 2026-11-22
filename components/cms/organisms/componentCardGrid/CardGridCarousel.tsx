"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type TransitionEvent,
} from "react";
import styles from "./ComponentCardGrid.module.scss";

export type CardGridVisibleCount = {
  mobile: number;
  tablet: number;
  desktop: number;
};

export type CardGridCarouselRange = "all" | "md-up" | "md-dn" | "sm" | "lg";

const CAROUSEL_RANGE_QUERY: Record<Exclude<CardGridCarouselRange, "all">, string> = {
  "md-up": "(min-width: 768px)",
  "md-dn": "(max-width: 991.98px)",
  sm: "(max-width: 767.98px)",
  lg: "(min-width: 992px)",
};

function Chevron({ direction }: { direction: "left" | "right" }) {
  const path = direction === "left" ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7";
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor">
      <path d={path} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function padIndex(index: number): string {
  return String(index + 1).padStart(2, "0");
}

function slideCopy(child: ReactNode, clone: boolean): ReactNode {
  if (!clone || !isValidElement(child)) {
    return child;
  }
  return cloneElement(child as ReactElement);
}

export function CardGridCarousel({
  label,
  labels,
  visible,
  range = "all",
  children,
}: {
  label: string;
  labels: string[];
  visible: CardGridVisibleCount;
  range?: CardGridCarouselRange;
  children: ReactNode;
}) {
  const items = Children.toArray(children);
  const count = items.length;
  const loop = count > 1;
  const trackSlides = loop
    ? [
        { item: items[count - 1], clone: true },
        ...items.map((item) => ({ item, clone: false })),
        { item: items[0], clone: true },
      ]
    : items.map((item) => ({ item, clone: false }));

  const trackRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(loop ? 1 : 0);
  const [offset, setOffset] = useState<number | null>(null);
  const [motion, setMotion] = useState(true);
  const [active, setActive] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);
  const dragStart = useRef<number | null>(null);

  const logicalIndex = (trackPosition: number) => {
    if (!loop) {
      return trackPosition;
    }
    if (trackPosition <= 0) {
      return count - 1;
    }
    if (trackPosition >= count + 1) {
      return 0;
    }
    return trackPosition - 1;
  };

  const current = logicalIndex(position);

  useEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (range === "all") {
      setActive(true);
      return;
    }
    const media = window.matchMedia(CAROUSEL_RANGE_QUERY[range]);
    const update = () => setActive(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [range]);

  useEffect(() => {
    const update = () => setViewportWidth(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useLayoutEffect(() => {
    const track = trackRef.current;
    const slides = track ? [...track.querySelectorAll<HTMLElement>("[data-cover-slide]")] : [];
    const origin = slides[0];
    const target = slides[position];
    if (!origin || !target) {
      return;
    }
    setOffset(origin.offsetLeft - target.offsetLeft);
  }, [position, count, viewportWidth, active]);

  useEffect(() => {
    if (motion) {
      return;
    }
    const frame = requestAnimationFrame(() => setMotion(true));
    return () => cancelAnimationFrame(frame);
  }, [motion, position]);

  const go = (direction: -1 | 1) => {
    if (!loop) {
      return;
    }
    const index = logicalIndex(position);
    if (direction === 1 && index === count - 1) {
      setMotion(true);
      setPosition(count + 1);
      return;
    }
    if (direction === -1 && index === 0) {
      setMotion(true);
      setPosition(0);
      return;
    }
    setMotion(true);
    setPosition(index + direction + (loop ? 1 : 0));
  };

  const goTo = (index: number) => {
    setMotion(true);
    setPosition(loop ? index + 1 : index);
  };

  const onTrackTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.target !== trackRef.current || event.propertyName !== "transform" || !loop) {
      return;
    }
    if (position === count + 1) {
      setMotion(false);
      setPosition(1);
    } else if (position === 0) {
      setMotion(false);
      setPosition(count);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!active || !loop) {
      return;
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      go(event.key === "ArrowLeft" ? -1 : 1);
    }
  };

  const rootStyle = {
    "--card-grid-slides-mobile": String(visible.mobile),
    "--card-grid-slides-tablet": String(visible.tablet),
    "--card-grid-slides-desktop": String(visible.desktop),
  } as CSSProperties;

  const rootClass = [styles.cardGrid__carousel, range === "all" ? "" : styles[`cardGrid__carousel--${range}`]]
    .filter(Boolean)
    .join(" ");

  const trackClass = [
    styles.cardGrid__coverTrack,
    offset === null && loop ? styles.cardGrid__coverTrackPending : "",
    motion && !reducedMotion ? styles.cardGrid__coverTrackMotion : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass} style={rootStyle} role="region" aria-roledescription={active ? "carousel" : undefined} aria-label={label}>
      <div className={styles.cardGrid__coverflow} tabIndex={active && loop ? 0 : undefined} onKeyDown={onKeyDown}>
        <div className={styles.cardGrid__viewport}>
          <div
            className={trackClass}
            ref={trackRef}
            style={offset === null ? undefined : { transform: `translateX(${offset}px)` }}
            onTransitionEnd={onTrackTransitionEnd}
            onPointerDown={(event) => {
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
              go(delta < 0 ? 1 : -1);
            }}
          >
            {trackSlides.map((slide, index) => (
              <div
                className={`${styles.cardGrid__coverSlide} ${index === position ? styles.cardGrid__coverSlideActive : ""}`}
                data-cover-slide
                key={`cover-${index}`}
                aria-hidden={slide.clone ? true : undefined}
              >
                {slideCopy(slide.item, slide.clone)}
              </div>
            ))}
          </div>
          {loop ? (
            <>
              <button type="button" className={`${styles.cardGrid__nav} ${styles.cardGrid__navPrev}`} aria-label="Previous slide" onClick={() => go(-1)}>
                <Chevron direction="left" />
              </button>
              <button type="button" className={`${styles.cardGrid__nav} ${styles.cardGrid__navNext}`} aria-label="Next slide" onClick={() => go(1)}>
                <Chevron direction="right" />
              </button>
            </>
          ) : null}
        </div>
        {loop ? (
          <div className={styles.cardGrid__stageControls}>
            <div className={styles.cardGrid__dots} role="tablist" aria-label="Slides">
              {items.map((item, index) => (
                <button
                  key={`dot-${index}`}
                  type="button"
                  className={`${styles.cardGrid__dot} ${index === current ? styles.cardGrid__dotActive : ""}`}
                  aria-label={`Go to slide ${index + 1}`}
                  aria-selected={index === current}
                  onClick={() => goTo(index)}
                />
              ))}
            </div>
            <div className={styles.cardGrid__progress} aria-hidden="true">
              <span className={styles.cardGrid__progressCurrent}>{padIndex(current)}</span>
              <span className={styles.cardGrid__progressRule} />
              <span className={styles.cardGrid__progressTotal}>{padIndex(count - 1)}</span>
            </div>
            <div className={styles.cardGrid__pills}>
              {items.map((item, index) => (
                <button
                  key={`pill-${index}`}
                  type="button"
                  className={`${styles.cardGrid__pill} ${index === current ? styles.cardGrid__pillActive : ""}`}
                  onClick={() => goTo(index)}
                >
                  {labels[index] || `Slide ${padIndex(index)}`}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
      <div className={`container ${styles.cardGrid__fallback}`}>
        {items.map((item, index) => (
          <div key={`fallback-${index}`}>{slideCopy(item, true)}</div>
        ))}
      </div>
    </div>
  );
}
