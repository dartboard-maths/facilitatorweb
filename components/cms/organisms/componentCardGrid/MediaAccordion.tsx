"use client";

import Image from "next/image";
import { Children, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import styles from "./ComponentCardGrid.module.scss";

export type MediaAccordionItem = {
  id: string;
  title: string;
  imageUrl?: string;
  imageAlt: string;
  accent: string;
};

function Chevron() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function padIndex(index: number): string {
  return String(index + 1).padStart(2, "0");
}

export function MediaAccordion({ items, children }: { items: MediaAccordionItem[]; children: ReactNode }) {
  const panels = Children.toArray(children);
  const listRef = useRef<HTMLDivElement>(null);
  const [openIndex, setOpenIndex] = useState(0);
  const [previousIndex, setPreviousIndex] = useState<number | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) {
      return;
    }
    const rows = [...list.querySelectorAll<HTMLElement>("[data-media-item]")];
    const gap = Number.parseFloat(getComputedStyle(list).rowGap || "0") || 0;
    let triggers = 0;
    let tallestPanel = 0;
    rows.forEach((row) => {
      triggers += row.querySelector("button")?.offsetHeight ?? 0;
      tallestPanel = Math.max(tallestPanel, row.querySelector("[data-media-panel]")?.scrollHeight ?? 0);
    });
    list.style.minHeight = `${triggers + Math.max(0, rows.length - 1) * gap + tallestPanel}px`;
  }, [items.length, openIndex]);

  const activate = (index: number) => {
    if (index === openIndex) {
      return;
    }
    setPreviousIndex(openIndex);
    setOpenIndex(index);
  };

  const accent = items[openIndex]?.accent || "#7dcf6a";

  return (
    <div className={`row gy-5 ${styles.mediaGrid}`}>
      <div className={`col-lg-6 ${styles.mediaCopy}`}>
        <div className={styles.mediaList} ref={listRef}>
          {items.map((item, index) => {
            const open = index === openIndex;
            const panelId = `media-accordion-${item.id}`;
            return (
              <div key={item.id} className={`${styles.mediaItem} ${open ? styles.mediaItemOpen : ""}`} data-media-item>
                <button
                  type="button"
                  className={styles.mediaTrigger}
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => activate(index)}
                >
                  <span className={styles.mediaIndex}>{padIndex(index)}</span>
                  <span className={styles.mediaTitle}>{item.title}</span>
                  <span className={styles.mediaChevron}>
                    <Chevron />
                  </span>
                </button>
                <div id={panelId} className={styles.mediaPanel}>
                  <div className={styles.mediaPanelInner} data-media-panel>
                    {panels[index]}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className={`col-lg-6 ${styles.mediaStageWrap}`}>
        <div className={styles.mediaStage}>
          <div className={styles.mediaBlob} style={{ backgroundColor: accent }} aria-hidden="true" />
          <div className={styles.mediaSlides}>
            {items.map((item, index) => {
              const active = index === openIndex;
              const leaving = index === previousIndex && !reducedMotion;
              const slideClass = [
                styles.mediaSlide,
                active ? styles.mediaSlideActive : "",
                leaving ? styles.mediaSlideLeaving : "",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <figure className={slideClass} key={item.id}>
                  {item.imageUrl ? (
                    <Image src={item.imageUrl} alt={item.imageAlt} fill sizes="(max-width: 992px) 22rem, 32rem" />
                  ) : null}
                </figure>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
