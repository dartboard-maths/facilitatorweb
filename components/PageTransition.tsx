"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import styles from "./PageTransition.module.scss";

type PageTransitionProps = {
  children: React.ReactNode;
};

export default function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [contentVisible, setContentVisible] = useState(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    const enterDelay = mountedRef.current ? 120 : 260;
    const preloaderMinimum = mountedRef.current ? 420 : 700;

    setIsLoading(true);
    setContentVisible(false);

    const showTimer = setTimeout(() => {
      setContentVisible(true);
    }, enterDelay);

    const hideTimer = setTimeout(() => {
      setIsLoading(false);
      mountedRef.current = true;
    }, preloaderMinimum);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [pathname]);

  return (
    <>
      <div className={`${styles.preloader} ${!isLoading ? styles.preloaderHidden : ""}`}>
        <div className={styles.preloader__spinner}>
          <div className={styles.preloader__spinnerCircle} />
          <div className={styles.preloader__spinnerX} />
        </div>
      </div>
      <div className={`${styles.content} ${contentVisible ? styles.contentVisible : ""}`}>{children}</div>
    </>
  );
}
