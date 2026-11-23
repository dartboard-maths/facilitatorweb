"use client";

import Image from "next/image";
import { Children, useEffect, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import styles from "./ComponentCardGrid.module.scss";

const HOVER_QUERY = "(hover: hover) and (pointer: fine) and (min-width: 768px)";

export type HoverGalleryPanel = {
  id: string;
  title: string;
  imageUrl?: string;
};

function canHover(): boolean {
  return window.matchMedia(HOVER_QUERY).matches;
}

export function HoverGallery({ panels, children }: { panels: HoverGalleryPanel[]; children: ReactNode }) {
  const copies = Children.toArray(children);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const media = window.matchMedia(HOVER_QUERY);
    const onChange = () => {
      if (!media.matches) {
        return;
      }
      setActiveIndex((current) => (current < 0 ? 0 : current));
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

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
    <div className={styles.galleryList} data-count={panels.length}>
      {panels.map((panel, index) => {
        const active = index === activeIndex;
        return (
          <article
            key={panel.id}
            className={`${styles.galleryPanel}${active ? ` ${styles.galleryPanelActive}` : ""}`}
            tabIndex={0}
            aria-expanded={active}
            onMouseEnter={() => onEnter(index)}
            onFocus={() => onEnter(index)}
            onClick={(event) => onClick(event, index)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            <div className={styles.galleryPhoto} aria-hidden="true">
              {panel.imageUrl ? (
                <Image src={panel.imageUrl} alt="" fill sizes="(max-width: 768px) 100vw, 50vw" />
              ) : null}
            </div>
            <div className={styles.galleryShade} aria-hidden="true" />
            {panel.title ? <h3 className={styles.gallerySpine}>{panel.title}</h3> : null}
            <div className={styles.galleryCopy}>
              {panel.title ? <h3 className={styles.galleryTitle}>{panel.title}</h3> : null}
              {copies[index]}
            </div>
          </article>
        );
      })}
    </div>
  );
}
