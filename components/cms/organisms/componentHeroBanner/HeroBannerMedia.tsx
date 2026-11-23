"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { CmsImage } from "../../../../lib/cms/contentful";
import styles from "./ComponentHeroBanner.module.scss";

const SLIDE_INTERVAL_MS = 6000;

type HeroBannerMediaProps = {
  images: CmsImage[];
};

export default function HeroBannerMedia({ images }: HeroBannerMediaProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const count = images.length;

  useEffect(() => {
    if (count < 2) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % count);
    }, SLIDE_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [count]);

  if (count === 0) {
    return null;
  }

  return (
    <div className={styles.heroBanner__media} aria-hidden="true">
      <div
        className={`${styles.heroBanner__carousel}${count > 1 ? ` ${styles["heroBanner__carousel--run"]}` : ""}`}
      >
        {images.map((image, index) => {
          const isActive = index === activeIndex;

          return (
            <div
              key={`${image.url}-${index}`}
              className={`${styles.heroBanner__slide}${isActive ? ` ${styles["heroBanner__slide--active"]}` : ""}`}
            >
              <Image
                src={image.url}
                alt=""
                fill
                sizes="100vw"
                priority={index === 0}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function HeroScroll({ label }: { label: string }) {
  return (
    <a
      className={styles.heroBanner__scroll}
      href="#content"
      onClick={(event) => {
        const hero = event.currentTarget.closest("section");
        const next = hero?.nextElementSibling;
        if (!(next instanceof HTMLElement)) {
          return;
        }

        event.preventDefault();
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        next.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
      }}
    >
      <span>{label}</span>
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    </a>
  );
}
